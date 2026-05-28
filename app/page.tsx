'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- Production Firebase Client Config Map ---
const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize safe runtime client instances
if (!getApps().length) {
  initializeApp(firebaseClientConfig);
}
const firestore = getFirestore();

// Structure definition mirroring your unified serverless collections
interface TradeRecord {
  id: string;
  ticket: string;
  symbol: string;
  botName: string;
  status: 'OPENED' | 'CLOSED';
  netProfit: number;
  openSide?: number; // 0 = BUY, 1 = SELL
  openTimestamp?: string;
  closedTimestamp?: string;
  updatedAt?: string;
}

export default function PhoenixMasterDashboard() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab Navigation View State Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'signals'>('overview');
  
  // Perspective Controller: 'all' = Unified Account State, 'bots' = Pure Algo, 'manual' = Discretionary Journal
  const [displayPerspective, setDisplayPerspective] = useState<'all' | 'bots' | 'manual'>('all');

  // Active Selected Bot Performance Tile Sub-Filter
  const [selectedBotFilter, setSelectedBotFilter] = useState<string>('ALL_BOTS');

  // Real-time listener binding stream
  useEffect(() => {
    const tradesQuery = query(collection(firestore, 'trades'), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(tradesQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TradeRecord[];
      
      setTrades(records);
      setLoading(false);
    }, (error) => {
      console.error("🚨 Firestore synchronization pipeline broke: ", error);
    });

    return () => unsubscribe();
  }, []);

  // --- PERSPECTIVE ROUTING ENGINE ---
  const filteredData = trades.filter((trade) => {
    const isManual = trade.botName === "Manual Execution";
    if (displayPerspective === 'manual') return isManual;
    if (displayPerspective === 'bots') {
      if (selectedBotFilter === 'ALL_BOTS') return !isManual;
      return trade.botName === selectedBotFilter;
    }
    return true; // Returns everything for the comprehensive 'all' perspective view
  });

  // Calculate Operational Downstream Accounting Variables Dynamically
  const totalOpenSignals = filteredData.filter(t => t.status === 'OPENED');
  const closedHistoricalLedger = filteredData.filter(t => t.status === 'CLOSED');
  
  const totalTradesCount = closedHistoricalLedger.length;
  const totalNetPnL = closedHistoricalLedger.reduce((sum, t) => sum + t.netProfit, 0);
  
  const winningTrades = closedHistoricalLedger.filter(t => t.netProfit > 0);
  const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;

  // Bot Specific Matrix Computations (Extracting performance allocations for isolated tiles)
  const getBotMetrics = (name: string) => {
    const botTrades = trades.filter(t => t.botName === name && t.status === 'CLOSED');
    const profit = botTrades.reduce((sum, t) => sum + t.netProfit, 0);
    return { count: botTrades.length, profit };
  };

  const apexMetrics = getBotMetrics("Gold Sentinel Apex");
  const hybridMetrics = getBotMetrics("Phoenix Gold Hybrid");
  const nqMetrics = getBotMetrics("Phoenix NQ");
  const discretionaryMetrics = getBotMetrics("Manual Execution");

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 font-mono text-cyan-400 text-xs tracking-widest animate-pulse">
        ⚡ PHOENIX DATASTREAM ONLINE // SYNCHRONIZING REALTIME MATRIX LEDGER...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 font-mono text-neutral-300 selection:bg-cyan-500 selection:text-black antialiased p-4 md:p-8">
      
      {/* SECTION 1: MASTER RIGID HUD BANNER CONTROL CENTER */}
      <header className="w-full bg-black/40 border border-neutral-900 rounded-xl p-4 mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-lg font-black tracking-wider text-white">PHOENIX COMMAND CENTER</h1>
            <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-cyan-400 px-2 py-0.5 rounded font-bold">v12.0.0 Production</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 uppercase tracking-tight">Hardened Multi-Bot Stream Mapping Layer</p>
        </div>

        {/* PERSPECTIVE SWITCHER: Controls what subset of ledger fields filter down */}
        <div className="flex items-center bg-neutral-900/80 border border-neutral-800 p-1 rounded-lg self-stretch lg:self-auto">
          <button 
            onClick={() => { setDisplayPerspective('all'); setSelectedBotFilter('ALL_BOTS'); }}
            className={`flex-1 lg:flex-none text-[11px] font-bold px-3 py-1.5 rounded transition-all duration-200 ${displayPerspective === 'all' ? 'bg-cyan-950 border border-cyan-800 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            COMBINED MONITOR
          </button>
          <button 
            onClick={() => setDisplayPerspective('bots')}
            className={`flex-1 lg:flex-none text-[11px] font-bold px-3 py-1.5 rounded transition-all duration-200 ${displayPerspective === 'bots' ? 'bg-indigo-950 border border-indigo-800 text-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            ROBOT CORE
          </button>
          <button 
            onClick={() => setDisplayPerspective('manual')}
            className={`flex-1 lg:flex-none text-[11px] font-bold px-3 py-1.5 rounded transition-all duration-200 ${displayPerspective === 'manual' ? 'bg-amber-950 border border-amber-800 text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            MANUAL DIARY
          </button>
        </div>
      </header>

      {/* SECTION 2: EXECUTIVE ACCOUNT OVERVIEW TILES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-black/20 border border-neutral-900 rounded-xl p-4 backdrop-blur-md">
          <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">NET PROFIT GENERATION</div>
          <div className={`text-2xl font-black mt-1 tracking-tight ${totalNetPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {totalNetPnL >= 0 ? `+$${totalNetPnL.toFixed(2)}` : `-$${Math.abs(totalNetPnL).toFixed(2)}`}
          </div>
          <div className="text-[10px] text-neutral-600 mt-2">ACCOUNT PARITY BASE BUDGET: $200.00</div>
        </div>

        <div className="bg-black/20 border border-neutral-900 rounded-xl p-4 backdrop-blur-md">
          <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">WIN RATE EFFICIENCY</div>
          <div className="text-2xl font-black mt-1 text-white tracking-tight">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-neutral-600 mt-2">WIN LOSS EXPONENT PROFILE MATRICES</div>
        </div>

        <div className="bg-black/20 border border-neutral-900 rounded-xl p-4 backdrop-blur-md">
          <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">EXECUTIVE ALLOCATIONS</div>
          <div className="text-2xl font-black mt-1 text-neutral-100 tracking-tight">
            {totalTradesCount} <span className="text-xs text-neutral-500 font-normal">CLOSED DEALS</span>
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-2 font-bold uppercase tracking-tighter">
            📡 {totalOpenSignals.length} POSITION EXPOSURES ACTIVE
          </div>
        </div>
      </div>

      {/* SUB-ROUTING PANEL IF ROBOT MODE IS ENABLED */}
      {displayPerspective === 'bots' && (
        <div className="bg-neutral-950 border border-neutral-900 p-2 rounded-xl mb-6 flex flex-wrap gap-2 items-center text-xs">
          <span className="text-neutral-500 font-bold px-2 uppercase text-[10px] tracking-widest">Bot Filter:</span>
          {['ALL_BOTS', 'Gold Sentinel Apex', 'Phoenix Gold Hybrid', 'Phoenix NQ'].map((bName) => (
            <button
              key={bName}
              onClick={() => setSelectedBotFilter(bName)}
              className={`px-3 py-1 rounded font-bold border transition-all ${selectedBotFilter === bName ? 'bg-indigo-950/60 border-indigo-500 text-indigo-400' : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:bg-neutral-900'}`}
            >
              {bName === 'ALL_BOTS' ? 'ALL ACTIVE ALGO ENGINE BLOCKS' : bName}
            </button>
          ))}
        </div>
      )}

      {/* SECTION 3: TAB COCKPIT SELECTION BAR */}
      <div className="flex border-b border-neutral-900 gap-4 mb-6">
        {(['overview', 'ledger', 'signals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-xs font-black tracking-widest uppercase transition-all duration-150 relative ${activeTab === tab ? 'text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400" />}
          </button>
        ))}
      </div>

      {/* SECTION 4: ROUTED COMPONENT SCREEN RENDER MATRIX */}
      <main className="w-full">
        
        {/* VIEW TAB 1: OVERVIEW TAB ENGINE ALLOCATION PANELS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Bot Asset Allocation Tile 1 */}
              <div className="border border-neutral-900 bg-black/30 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-cyan-400" />
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Gold Sentinel Apex</div>
                <div className="text-lg font-black text-white mt-2">${apexMetrics.profit.toFixed(2)}</div>
                <div className="text-[10px] text-neutral-500 mt-1">{apexMetrics.count} settled executions</div>
              </div>

              {/* Bot Asset Allocation Tile 2 */}
              <div className="border border-neutral-900 bg-black/30 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-indigo-500" />
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Phoenix Gold Hybrid</div>
                <div className="text-lg font-black text-white mt-2">${hybridMetrics.profit.toFixed(2)}</div>
                <div className="text-[10px] text-neutral-500 mt-1">{hybridMetrics.count} settled executions</div>
              </div>

              {/* Bot Asset Allocation Tile 3 */}
              <div className="border border-neutral-900 bg-black/30 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-purple-500" />
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Phoenix NQ</div>
                <div className="text-lg font-black text-white mt-2">${nqMetrics.profit.toFixed(2)}</div>
                <div className="text-[10px] text-neutral-500 mt-1">{nqMetrics.count} settled executions</div>
              </div>

              {/* Bot Asset Allocation Tile 4 */}
              <div className="border border-neutral-900 bg-black/30 p-4 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Discretionary Manual</div>
                <div className="text-lg font-black text-white mt-2">${discretionaryMetrics.profit.toFixed(2)}</div>
                <div className="text-[10px] text-neutral-500 mt-1">{discretionaryMetrics.count} manually logged entry sets</div>
              </div>

            </div>

            <div className="p-8 border border-neutral-900 rounded-xl bg-black/10 text-center text-xs text-neutral-500 italic">
              💡 Pro Tip: Select the perspectives inside the upper HUD corner matrix to filter out and evaluate distinct operational layers across your trading dashboard.
            </div>
          </div>
        )}

        {/* VIEW TAB 2: HISTORICAL RUNTIME TRANSACTION LEDGER */}
        {activeTab === 'ledger' && (
          <div className="border border-neutral-900 bg-neutral-950/60 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-900 bg-black/20 flex justify-between items-center">
              <span className="text-xs font-bold tracking-widest text-white uppercase">Historical Execution Audit Feed Ledger</span>
              <span className="text-[10px] font-bold text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">{closedHistoricalLedger.length} Records Loaded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-900 bg-neutral-900/20 text-neutral-500 text-[10px] tracking-wider uppercase font-black">
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Trading System Identity</th>
                    <th className="p-3">Asset Pair</th>
                    <th className="p-3">Liquidation Timestamp</th>
                    <th className="p-3 text-right">Settled Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/60">
                  {closedHistoricalLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-600 italic">No structured data documents matched your active perspective filter selections.</td>
                    </tr>
                  ) : closedHistoricalLedger.map((trade) => (
                    <tr key={trade.id} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-3 text-neutral-400 font-bold">#{trade.ticket}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trade.botName === 'Manual Execution' ? 'bg-amber-950/40 text-amber-400 border border-amber-900' : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900'}`}>
                          {trade.botName}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-neutral-100">{trade.symbol}</td>
                      <td className="p-3 text-neutral-500">{trade.closedTimestamp || 'Broker Server Loop Syncing'}</td>
                      <td className={`p-3 text-right font-bold font-mono text-sm ${trade.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {trade.netProfit >= 0 ? `+$${trade.netProfit.toFixed(2)}` : `-$${Math.abs(trade.netProfit).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW TAB 3: SIGNALS TAB - REVEALING OPEN MT5 FIELD EXPOSURE */}
        {activeTab === 'signals' && (
          <div className="border border-neutral-900 bg-neutral-950/60 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-900 bg-black/20">
              <span className="text-xs font-bold tracking-widest text-white uppercase">Live Signals Tracking Grid</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {totalOpenSignals.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-neutral-600 italic text-xs border border-dashed border-neutral-900 rounded-xl">
                  📡 All terminal positions currently flat. Waiting for directional institutional zone entry setups...
                </div>
              ) : totalOpenSignals.map((signal) => (
                <div key={signal.id} className="border border-neutral-900 bg-neutral-900/20 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${signal.openSide === 0 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {signal.openSide === 0 ? 'BUY POSITION' : 'SELL POSITION'}
                      </span>
                      <span className="font-bold text-white text-sm">{signal.symbol}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-2 uppercase font-semibold">Engine Block Reference: {signal.botName}</div>
                    <div className="text-[10px] text-neutral-600 mt-1">Allocation Log Ticket: #{signal.ticket}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-cyan-400 font-bold block tracking-widest uppercase animate-pulse">IN MARKET</span>
                    <span className="text-[10px] text-neutral-500 block mt-2">{signal.openTimestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}