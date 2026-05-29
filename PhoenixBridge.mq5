//+------------------------------------------------------------------+
//| Phoenix Bridge EA — MT5 → Phoenix Trading Dashboard             |
//| Pushes SMC analysis to Phoenix after each H1 candle close       |
//| Compatible with: Gold Sentinel Apex, Phoenix NQ Engine,         |
//|                  SD7 Scalp / HFT Institutional Scalper           |
//|                                                                  |
//| SETUP:                                                           |
//| 1. Set PhoenixBaseURL to your Vercel deployment URL             |
//| 2. Set PhoenixSecret to match MT5_PUSH_SECRET in .env           |
//| 3. Attach to any chart — it runs independently of trade logic   |
//+------------------------------------------------------------------+

#property copyright "Phoenix Trading Dashboard"
#property version   "2.0"
#property strict

//── Input Parameters ──────────────────────────────────────────────
input string   PhoenixBaseURL   = "https://your-phoenix-dashboard.vercel.app";
input string   PhoenixSecret    = "";          // Match MT5_PUSH_SECRET env var
input ENUM_TIMEFRAMES HTFTimeframe = PERIOD_D1; // HTF for bias assessment
input int      SMC_LookbackBars = 50;          // Bars to scan for OB/FVG
input int      ATR_Period       = 14;          // ATR for volatility scoring
input bool     PushKeyLevels    = true;        // Push to /api/market/keylevels
input bool     PushQuotes       = true;        // Push to /api/market/quotes
input bool     TriggerAgentRun  = true;        // Trigger /api/agents/run after push
input string   DefaultTimeframe = "H1";       // Timeframe label for agent run
input bool     VerboseLogging   = false;       // Detailed print output

//── Global State ──────────────────────────────────────────────────
datetime g_lastCandleTime = 0;
int      g_atrHandle;
int      g_httpTimeout = 5000; // ms

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   g_atrHandle = iATR(_Symbol, PERIOD_CURRENT, ATR_Period);
   if(g_atrHandle == INVALID_HANDLE)
   {
      Print("[PhoenixBridge] Failed to create ATR indicator");
      return INIT_FAILED;
   }
   
   Print("[PhoenixBridge] Initialized on ", _Symbol, 
         " | Phoenix: ", PhoenixBaseURL);
   
   // Push immediately on attach
   PushToPhoenix();
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert tick function — triggers on new candle close              |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime currentCandleTime = iTime(_Symbol, PERIOD_CURRENT, 0);
   
   if(currentCandleTime != g_lastCandleTime)
   {
      g_lastCandleTime = currentCandleTime;
      PushToPhoenix();
   }
}

//+------------------------------------------------------------------+
//| Main push function                                               |
//+------------------------------------------------------------------+
void PushToPhoenix()
{
   if(VerboseLogging)
      Print("[PhoenixBridge] New candle — analyzing ", _Symbol);

   //── Core price data ──────────────────────────────────────────
   double currentPrice = iClose(_Symbol, PERIOD_CURRENT, 1); // Last closed candle
   double openPrice    = iOpen(_Symbol, PERIOD_CURRENT, 1);
   double highPrice    = iHigh(_Symbol, PERIOD_CURRENT, 1);
   double lowPrice     = iLow(_Symbol, PERIOD_CURRENT, 1);

   //── 52-week range ─────────────────────────────────────────────
   int barsInYear = PeriodSeconds(PERIOD_D1) > 0
      ? (int)(365 * PeriodSeconds(PERIOD_D1) / PeriodSeconds(PERIOD_CURRENT))
      : 365;
   
   double high52w = iHigh(_Symbol, PERIOD_CURRENT, iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, barsInYear, 1));
   double low52w  = iLow(_Symbol, PERIOD_CURRENT, iLowest(_Symbol, PERIOD_CURRENT, MODE_LOW, barsInYear, 1));

   //── HTF Bias Assessment ───────────────────────────────────────
   string htfBias       = GetHTFBias();
   int    htfConfidence = GetHTFConfidence(htfBias);

   //── Market Structure: BOS / CHoCH ────────────────────────────
   bool bosDetected  = DetectBOS();
   bool chochDetected = DetectCHoCH();

   //── Premium / Discount / Equilibrium ─────────────────────────
   double equilibrium = (high52w + low52w) / 2.0;
   double rangePos    = (high52w - low52w) > 0
      ? (currentPrice - low52w) / (high52w - low52w) : 0.5;
   string premiumDiscount = rangePos > 0.60 ? "premium"
      : rangePos < 0.40 ? "discount" : "equilibrium";

   //── Order Block Detection ─────────────────────────────────────
   double obLow = 0, obHigh = 0;
   string obType = "bullish";
   FindNearestOrderBlock(obLow, obHigh, obType);

   //── FVG Detection ─────────────────────────────────────────────
   double fvgHigh = 0, fvgLow = 0;
   string fvgDir = "bullish";
   bool   fvgFilled = false;
   FindNearestFVG(fvgHigh, fvgLow, fvgDir, fvgFilled);

   //── Volatility Score (ATR-based, 0-100) ──────────────────────
   double atrBuffer[];
   ArraySetAsSeries(atrBuffer, true);
   int copied = CopyBuffer(g_atrHandle, 0, 1, 14, atrBuffer);
   
   double currentATR = (copied > 0) ? atrBuffer[0] : (highPrice - lowPrice);
   double atrNorm    = (currentPrice > 0) ? (currentATR / currentPrice) * 10000 : 50;
   int    volatilityScore = (int)MathMin(100, MathMax(0, atrNorm * 4));

   //── Session Score ─────────────────────────────────────────────
   int sessionScore = GetSessionScore();
   string sessionName = GetCurrentSession();

   //── Daily change % ────────────────────────────────────────────
   double prevClose = iClose(_Symbol, PERIOD_D1, 1);
   double pctChange = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100.0 : 0;

   //── Push to /api/market/keylevels ─────────────────────────────
   if(PushKeyLevels)
   {
      string keyLevelsPayload = BuildKeyLevelsPayload(
         currentPrice, high52w, low52w,
         bosDetected, chochDetected,
         premiumDiscount, equilibrium,
         obLow, obHigh, obType,
         fvgHigh, fvgLow, fvgDir, fvgFilled,
         htfBias, htfConfidence,
         sessionName, volatilityScore, sessionScore
      );

      string url = PhoenixBaseURL + "/api/market/keylevels";
      int statusKL = PostJSON(url, keyLevelsPayload);
      
      if(VerboseLogging)
         Print("[PhoenixBridge] /keylevels status: ", statusKL);
   }

   //── Push to /api/market/quotes ────────────────────────────────
   if(PushQuotes)
   {
      string quotesPayload = StringFormat(
         "{\"symbol\":\"%s\",\"price\":%.5f,\"change\":%.5f,\"changePercent\":%.4f}",
         _Symbol, currentPrice, currentPrice - prevClose, pctChange
      );

      string urlQ = PhoenixBaseURL + "/api/market/quotes";
      PostJSON(urlQ, quotesPayload);
   }

   //── Trigger Agent Run ─────────────────────────────────────────
   if(TriggerAgentRun)
   {
      // Small delay to let keylevels write complete
      Sleep(500);
      
      string agentPayload = StringFormat(
         "{\"symbol\":\"%s\",\"timeframe\":\"%s\",\"forceRefresh\":true}",
         _Symbol, DefaultTimeframe
      );

      string urlA = PhoenixBaseURL + "/api/agents/run";
      int statusA = PostJSON(urlA, agentPayload);
      
      if(VerboseLogging)
         Print("[PhoenixBridge] /agents/run status: ", statusA);
   }
}

//+------------------------------------------------------------------+
//| Build the keylevels POST payload                                 |
//+------------------------------------------------------------------+
string BuildKeyLevelsPayload(
   double price, double h52, double l52,
   bool bos, bool choch,
   string premDisc, double eq,
   double obLow, double obHigh, string obType,
   double fvgH, double fvgL, string fvgDir, bool fvgFilled,
   string htfBias, int htfConf,
   string session, int volScore, int sesScore
)
{
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   string fmt = "%."+IntegerToString(digits)+"f";
   
   string obPrice = StringFormat(fmt, (obLow + obHigh) / 2.0);
   string obZone  = StringFormat("["+fmt+","+fmt+"]", obLow, obHigh);
   string fvgMid  = StringFormat(fmt, (fvgH + fvgL) / 2.0);

   string payload = StringFormat(
      "{"
      "\"asset\":\"%s\","
      "\"price\":%s,"
      "\"high52w\":%s,"
      "\"low52w\":%s,"
      "\"bos\":%s,"
      "\"choch\":%s,"
      "\"premiumDiscount\":\"%s\","
      "\"equilibrium\":%s,"
      "\"orderBlock\":{"
        "\"price\":%s,"
        "\"zone\":%s,"
        "\"type\":\"%s\""
      "},"
      "\"fvg\":{"
        "\"high\":%s,"
        "\"low\":%s,"
        "\"direction\":\"%s\","
        "\"filled\":%s"
      "},"
      "\"htfBias\":\"%s\","
      "\"htfConfidence\":%d,"
      "\"session\":\"%s\","
      "\"volatilityScore\":%d,"
      "\"sessionScore\":%d"
      "}",
      _Symbol,
      StringFormat(fmt, price),
      StringFormat(fmt, h52),
      StringFormat(fmt, l52),
      bos  ? "true" : "false",
      choch ? "true" : "false",
      premDisc,
      StringFormat(fmt, eq),
      obPrice, obZone, obType,
      StringFormat(fmt, fvgH),
      StringFormat(fmt, fvgL),
      fvgDir,
      fvgFilled ? "true" : "false",
      htfBias, htfConf,
      session,
      volScore, sesScore
   );

   return payload;
}

//+------------------------------------------------------------------+
//| HTTP POST with JSON body                                         |
//+------------------------------------------------------------------+
int PostJSON(const string url, const string payload)
{
   string headers = "Content-Type: application/json\r\n";
   if(StringLen(PhoenixSecret) > 0)
      headers += "x-phoenix-secret: " + PhoenixSecret + "\r\n";

   char postData[];
   char result[];
   string resultHeaders;

   StringToCharArray(payload, postData, 0, StringLen(payload));
   ArrayResize(postData, ArraySize(postData) - 1); // remove null terminator

   ResetLastError();
   int res = WebRequest("POST", url, headers, g_httpTimeout, postData, result, resultHeaders);
   
   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4060 || err == 5203)
         Print("[PhoenixBridge] WebRequest blocked — add URL to allowed list in MT5 Tools > Options > Expert Advisors");
      else if(VerboseLogging)
         Print("[PhoenixBridge] WebRequest error ", err, " for ", url);
   }

   return res;
}

//+------------------------------------------------------------------+
//| HTF Bias: Compare price to HTF structure                        |
//+------------------------------------------------------------------+
string GetHTFBias()
{
   double htfOpen  = iOpen(_Symbol, HTFTimeframe, 1);
   double htfClose = iClose(_Symbol, HTFTimeframe, 1);
   double htfHigh  = iHigh(_Symbol, HTFTimeframe, 1);
   double htfLow   = iLow(_Symbol, HTFTimeframe, 1);
   double htfMid   = (htfHigh + htfLow) / 2.0;

   double currentPrice = iClose(_Symbol, PERIOD_CURRENT, 1);

   if(currentPrice > htfHigh * 0.998)  return "bullish";
   if(currentPrice < htfLow  * 1.002)  return "bearish";
   if(htfClose > htfOpen)              return "bullish";
   if(htfClose < htfOpen)              return "bearish";
   return "neutral";
}

int GetHTFConfidence(const string bias)
{
   // Count agreeing candles on HTF
   int agree = 0;
   for(int i = 1; i <= 5; i++)
   {
      double o = iOpen(_Symbol, HTFTimeframe, i);
      double c = iClose(_Symbol, HTFTimeframe, i);
      bool isBull = (c > o);
      if((bias == "bullish" && isBull) || (bias == "bearish" && !isBull))
         agree++;
   }
   return 40 + agree * 12; // 40-100 range
}

//+------------------------------------------------------------------+
//| BOS Detection: New HH/LL vs previous swing                      |
//+------------------------------------------------------------------+
bool DetectBOS()
{
   int lookback = MathMin(SMC_LookbackBars, iBars(_Symbol, PERIOD_CURRENT) - 2);
   if(lookback < 10) return false;

   // Find recent swing high and swing low
   int swingHighBar = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, lookback / 2, 1);
   int swingLowBar  = iLowest (_Symbol, PERIOD_CURRENT, MODE_LOW,  lookback / 2, 1);
   
   double currentHigh = iHigh(_Symbol, PERIOD_CURRENT, 1);
   double currentLow  = iLow (_Symbol, PERIOD_CURRENT, 1);
   double prevSwingHigh = iHigh(_Symbol, PERIOD_CURRENT, swingHighBar);
   double prevSwingLow  = iLow (_Symbol, PERIOD_CURRENT, swingLowBar);

   // BOS = current price breaks past recent swing extreme
   return (currentHigh > prevSwingHigh * 1.0005) || (currentLow < prevSwingLow * 0.9995);
}

//+------------------------------------------------------------------+
//| CHoCH Detection: Lower High or Higher Low formation              |
//+------------------------------------------------------------------+
bool DetectCHoCH()
{
   if(iBars(_Symbol, PERIOD_CURRENT) < SMC_LookbackBars + 5) return false;

   // Simple: compare last 3 swing highs or lows for structural shift
   double h1 = iHigh(_Symbol, PERIOD_CURRENT, 3);
   double h2 = iHigh(_Symbol, PERIOD_CURRENT, 6);
   double h3 = iHigh(_Symbol, PERIOD_CURRENT, 9);
   double l1 = iLow(_Symbol, PERIOD_CURRENT, 3);
   double l2 = iLow(_Symbol, PERIOD_CURRENT, 6);
   double l3 = iLow(_Symbol, PERIOD_CURRENT, 9);

   // CHoCH (bearish): Lower Highs pattern (HH → LH)
   bool bearishCHoCH = (h1 < h2 && h2 > h3);
   // CHoCH (bullish): Higher Lows pattern (LL → HL)
   bool bullishCHoCH = (l1 > l2 && l2 < l3);

   return bearishCHoCH || bullishCHoCH;
}

//+------------------------------------------------------------------+
//| Order Block: Last strong opposing candle before a BOS           |
//+------------------------------------------------------------------+
void FindNearestOrderBlock(double &obLow, double &obHigh, string &obType)
{
   int lookback = MathMin(SMC_LookbackBars, iBars(_Symbol, PERIOD_CURRENT) - 2);
   double currentPrice = iClose(_Symbol, PERIOD_CURRENT, 1);
   
   // Find most recent strong candle below current price (bullish OB)
   for(int i = 2; i < lookback; i++)
   {
      double candleBody = MathAbs(iClose(_Symbol, PERIOD_CURRENT, i) - iOpen(_Symbol, PERIOD_CURRENT, i));
      double candleRange = iHigh(_Symbol, PERIOD_CURRENT, i) - iLow(_Symbol, PERIOD_CURRENT, i);
      
      // Strong candle = body > 60% of range
      if(candleRange > 0 && (candleBody / candleRange) > 0.60)
      {
         double candleMid = (iHigh(_Symbol, PERIOD_CURRENT, i) + iLow(_Symbol, PERIOD_CURRENT, i)) / 2.0;
         
         // Bullish OB: below current price, was a bearish candle before reversal
         if(candleMid < currentPrice && iClose(_Symbol, PERIOD_CURRENT, i) < iOpen(_Symbol, PERIOD_CURRENT, i))
         {
            obLow  = iLow(_Symbol, PERIOD_CURRENT, i);
            obHigh = iHigh(_Symbol, PERIOD_CURRENT, i);
            obType = "bullish";
            return;
         }
         // Bearish OB: above current price, was a bullish candle before reversal
         if(candleMid > currentPrice && iClose(_Symbol, PERIOD_CURRENT, i) > iOpen(_Symbol, PERIOD_CURRENT, i))
         {
            obLow  = iLow(_Symbol, PERIOD_CURRENT, i);
            obHigh = iHigh(_Symbol, PERIOD_CURRENT, i);
            obType = "bearish";
            return;
         }
      }
   }

   // Fallback: use recent candle range
   obLow  = iLow(_Symbol, PERIOD_CURRENT, 3);
   obHigh = iHigh(_Symbol, PERIOD_CURRENT, 3);
   obType = (iClose(_Symbol, PERIOD_CURRENT, 3) > iOpen(_Symbol, PERIOD_CURRENT, 3)) ? "bullish" : "bearish";
}

//+------------------------------------------------------------------+
//| FVG Detection: 3-candle imbalance gaps                          |
//+------------------------------------------------------------------+
void FindNearestFVG(double &fvgHigh, double &fvgLow, string &fvgDir, bool &filled)
{
   double currentPrice = iClose(_Symbol, PERIOD_CURRENT, 1);
   int lookback = MathMin(SMC_LookbackBars, iBars(_Symbol, PERIOD_CURRENT) - 3);

   for(int i = 2; i < lookback; i++)
   {
      double prevLow   = iLow(_Symbol, PERIOD_CURRENT, i + 1);
      double prevHigh  = iHigh(_Symbol, PERIOD_CURRENT, i + 1);
      double nextLow   = iLow(_Symbol, PERIOD_CURRENT, i - 1);
      double nextHigh  = iHigh(_Symbol, PERIOD_CURRENT, i - 1);

      // Bullish FVG: gap between prev candle high and next candle low
      if(nextLow > prevHigh)
      {
         fvgLow  = prevHigh;
         fvgHigh = nextLow;
         fvgDir  = "bullish";
         filled  = (currentPrice < fvgLow); // filled if price returned into gap
         return;
      }

      // Bearish FVG: gap between prev candle low and next candle high
      if(nextHigh < prevLow)
      {
         fvgHigh = prevLow;
         fvgLow  = nextHigh;
         fvgDir  = "bearish";
         filled  = (currentPrice > fvgHigh);
         return;
      }
   }

   // Fallback
   fvgHigh = iHigh(_Symbol, PERIOD_CURRENT, 5);
   fvgLow  = iLow(_Symbol, PERIOD_CURRENT, 5);
   fvgDir  = "bullish";
   filled  = false;
}

//+------------------------------------------------------------------+
//| Session detection (UTC hours)                                    |
//+------------------------------------------------------------------+
string GetCurrentSession()
{
   MqlDateTime dt;
   TimeToStruct(TimeGMT(), dt);
   int h = dt.hour;

   if(h >= 22 || h < 7)  return "sydney";
   if(h >= 0  && h < 9)  return "asia";
   if(h >= 8  && h < 17) return "london";
   return "new-york";
}

int GetSessionScore()
{
   string session = GetCurrentSession();
   if(session == "london")   return 80;
   if(session == "new-york") return 75;
   if(session == "asia")     return 55;
   return 35; // sydney
}

//+------------------------------------------------------------------+
//| Cleanup                                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(g_atrHandle != INVALID_HANDLE)
      IndicatorRelease(g_atrHandle);
   Print("[PhoenixBridge] Deinitialized — reason: ", reason);
}
