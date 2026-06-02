// lib/generate-sync-script.ts
// ─────────────────────────────────────────────────────────────────────────────
// Builds the personalised .mq5 script string for a given user.
// Token + webhook URL are injected — the user downloads and runs with
// zero configuration needed.
// ─────────────────────────────────────────────────────────────────────────────

export function generateSyncScript(token: string, webhookUrl: string): string {
  return `//+------------------------------------------------------------------+
//|               Phoenix Universal Trade Sync                       |
//|          Auto-generated — do not edit token or URL               |
//+------------------------------------------------------------------+
//  HOW TO USE:
//  1. Copy this file to: [MT5 Data Folder]/MQL5/Scripts/
//  2. In MetaTrader 5: right-click any chart → Scripts → Phoenix_Sync
//  3. Set DryRun = false when ready to sync for real
//  4. Trades will appear in your Phoenix Dashboard within seconds
//
//  NOTES:
//  - This token is single-use and expires 48 hours after generation
//  - All closed trades on this account will be synced
//  - Re-running is safe — duplicates are automatically skipped
//  - Do NOT share this file — it contains your personal sync token
//+------------------------------------------------------------------+
#property copyright "Phoenix Trading Ecosystem"
#property version   "1.00"
#property strict
#property script_show_inputs

//--- User-configurable inputs
input bool InpDryRun    = true;   // DRY RUN: Set false to actually sync
input int  InpBatchSize = 50;     // Trades per HTTP request (keep 50)
input int  InpDelayMs   = 200;    // Delay between batches (ms)

//--- Injected at generation time — do not modify
string SYNC_TOKEN   = "${token}";
string WEBHOOK_URL  = "${webhookUrl}/api/sync-historical";

//+------------------------------------------------------------------+
//| Build a JSON string for one trade                                |
//+------------------------------------------------------------------+
string TradeToJSON(
  string ticket, string symbol, double profit,
  double commission, double swap, string direction,
  double entryPrice, double closePrice, double lotSize,
  string openTime, string closeTime
) {
  return StringFormat(
    "{"
      "\\"ticket\\":\\"%s\\","
      "\\"symbol\\":\\"%s\\","
      "\\"profit\\":%.2f,"
      "\\"commission\\":%.2f,"
      "\\"swap\\":%.2f,"
      "\\"direction\\":\\"%s\\","
      "\\"entryPrice\\":%.5f,"
      "\\"closePrice\\":%.5f,"
      "\\"lotSize\\":%.2f,"
      "\\"openTime\\":\\"%s\\","
      "\\"closeTime\\":\\"%s\\""
    "}",
    ticket, symbol, profit, commission, swap,
    direction, entryPrice, closePrice, lotSize,
    openTime, closeTime
  );
}

//+------------------------------------------------------------------+
//| Format datetime to ISO 8601                                      |
//+------------------------------------------------------------------+
string FormatISO(datetime t) {
  MqlDateTime dt;
  TimeToStruct(t, dt);
  return StringFormat("%d-%02d-%02dT%02d:%02d:%02dZ",
    dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

//+------------------------------------------------------------------+
//| Send a batch of trades to the webhook                            |
//+------------------------------------------------------------------+
bool SendBatch(string &tradeJsons[], int from, int to) {
  string tradesArr = "";
  for (int i = from; i <= to && i < ArraySize(tradeJsons); i++) {
    if (i > from) tradesArr += ",";
    tradesArr += tradeJsons[i];
  }

  string json = "{\\"syncToken\\":\\"" + SYNC_TOKEN + "\\",\\"trades\\":[" + tradesArr + "]}";

  char   postData[], result[];
  string resultHeaders;
  string headers = "Content-Type: application/json\\r\\n";

  StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
  ArrayResize(postData, ArraySize(postData) - 1);

  int httpCode = WebRequest("POST", WEBHOOK_URL, headers, 15000, postData, result, resultHeaders);

  if (httpCode == -1) {
    Print("   ❌ Network error: ", GetLastError(), " — check MT5 allowed URLs list");
    return false;
  }

  string responseStr = CharArrayToString(result);
  Print("   → Batch response [", httpCode, "]: ", StringSubstr(responseStr, 0, 120));
  return true;
}

//+------------------------------------------------------------------+
//| Main                                                             |
//+------------------------------------------------------------------+
void OnStart() {
  Print("═══════════════════════════════════════════════════════════════");
  Print("  PHOENIX UNIVERSAL SYNC v1.0");
  Print("  Mode: ", InpDryRun ? "🔍 DRY RUN — no data will be sent" : "🚀 LIVE — syncing to your dashboard");
  Print("═══════════════════════════════════════════════════════════════");

  // IMPORTANT: Add your webhook domain to MT5 allowed URLs:
  // Tools → Options → Expert Advisors → Allow WebRequest for listed URL
  // Add: ${webhookUrl}
  Print("  ⚠  Ensure '${webhookUrl}' is in MT5 allowed URLs");
  Print("     Tools → Options → Expert Advisors → Allow WebRequest");
  Print("═══════════════════════════════════════════════════════════════");

  HistorySelect(0, TimeCurrent());
  int totalDeals = HistoryDealsTotal();

  // Collect all closing deals into JSON strings
  string tradeJsons[];
  int    tradeCount = 0;
  int    skipped    = 0;

  for (int i = 0; i < totalDeals; i++) {
    ulong ticket = HistoryDealGetTicket(i);
    if (ticket == 0) { skipped++; continue; }

    // Only closing deals (DEAL_ENTRY_OUT)
    long dealEntry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
    if (dealEntry != DEAL_ENTRY_OUT) { skipped++; continue; }

    long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
    if (dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) { skipped++; continue; }

    string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
    double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
    double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
    double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
    double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
    double lotSize    = HistoryDealGetDouble(ticket, DEAL_VOLUME);
    datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);

    // Determine direction: closing deal type is INVERTED (BUY = was SELL, SELL = was BUY)
    string direction = (dealType == DEAL_TYPE_BUY) ? "SELL" : "BUY";

    // Get entry price and open time from the opening deal
    double   entryPrice = 0.0;
    datetime openTime   = closeTime;
    long posId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
    if (posId > 0 && HistorySelectByPosition(posId)) {
      int posDeals = HistoryDealsTotal();
      for (int j = 0; j < posDeals; j++) {
        ulong openTkt = HistoryDealGetTicket(j);
        if (HistoryDealGetInteger(openTkt, DEAL_ENTRY) == DEAL_ENTRY_IN) {
          entryPrice = HistoryDealGetDouble(openTkt, DEAL_PRICE);
          openTime   = (datetime)HistoryDealGetInteger(openTkt, DEAL_TIME);
          // Direction from opening deal (more reliable)
          long openType = HistoryDealGetInteger(openTkt, DEAL_TYPE);
          direction = (openType == DEAL_TYPE_BUY) ? "BUY" : "SELL";
          break;
        }
      }
      HistorySelect(0, TimeCurrent()); // restore full history selection
    }

    string ticketStr = IntegerToString((long)ticket);
    double netProfit = profit + commission + swap;

    Print(StringFormat("  [%d] #%s | %s | %s | Net: %+.2f | Entry: %.5f",
      tradeCount + 1, ticketStr, symbol, direction, netProfit, entryPrice));

    if (!InpDryRun) {
      ArrayResize(tradeJsons, tradeCount + 1);
      tradeJsons[tradeCount] = TradeToJSON(
        ticketStr, symbol, profit, commission, swap, direction,
        entryPrice, closePrice, lotSize,
        FormatISO(openTime), FormatISO(closeTime)
      );
    }
    tradeCount++;
  }

  Print("═══════════════════════════════════════════════════════════════");
  Print("  Trades found : ", tradeCount);
  Print("  Skipped      : ", skipped, " (deposits, non-trade deals)");

  if (InpDryRun) {
    Print("  DRY RUN complete — set InpDryRun = false to send to dashboard");
    Print("═══════════════════════════════════════════════════════════════");
    return;
  }

  // Send in batches
  int totalBatches = (int)MathCeil((double)tradeCount / InpBatchSize);
  int totalSent    = 0;

  Print("  Sending ", totalBatches, " batch(es) of up to ", InpBatchSize, " trades each...");
  Print("═══════════════════════════════════════════════════════════════");

  for (int b = 0; b < totalBatches; b++) {
    int from = b * InpBatchSize;
    int to   = MathMin(from + InpBatchSize - 1, tradeCount - 1);
    Print("  📦 Batch ", b + 1, "/", totalBatches, " — trades ", from + 1, " to ", to + 1);
    bool ok = SendBatch(tradeJsons, from, to);
    if (ok) totalSent += (to - from + 1);
    Sleep(InpDelayMs);
  }

  Print("═══════════════════════════════════════════════════════════════");
  Print("  ✅ SYNC COMPLETE");
  Print("  Trades sent  : ", totalSent);
  Print("  Check your Phoenix Dashboard — trades appear within 5 seconds");
  Print("═══════════════════════════════════════════════════════════════");
}
`;
}

// ── Trigger browser download of the .mq5 file ───────────────────────────────
export function downloadSyncScript(token: string, webhookUrl: string, filename = "Phoenix_Sync.mq5") {
  const content = generateSyncScript(token, webhookUrl)
  const blob    = new Blob([content], { type: "text/plain" })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement("a")
  a.href        = url
  a.download    = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
