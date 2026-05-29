"use client"

import { useState } from "react"
import { Plus, Settings, Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  notes: string
}

interface BotPerformance {
  name: string
  pnl: number
}

interface TradeJournalProps {
  trades?: Trade[]
  botPerformance?: BotPerformance[]
  onAddTrade?: () => void
}

export function TradeJournal({ 
  trades = [], 
  botPerformance = [
    { name: "EMA Bot Alpha", pnl: 0 },
    { name: "RSI Bot Beta", pnl: 0 }
  ],
  onAddTrade 
}: TradeJournalProps) {
  const [activeTab, setActiveTab] = useState("manual")

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4 text-primary" />
          Trade Journal & Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="manual">[ Manual ]</TabsTrigger>
            <TabsTrigger value="automated">[ Automated Bots ]</TabsTrigger>
            <TabsTrigger value="combined">[ Combined ]</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Manual Entries */}
              <div>
                <h3 className="text-sm font-medium mb-3">Recent Manual Entries</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Symbol</TableHead>
                        <TableHead className="text-xs">Setup</TableHead>
                        <TableHead className="text-xs">R-Multiple</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No entries yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        trades.map((trade) => (
                          <TableRow key={trade.id}>
                            <TableCell className="text-xs">{trade.date}</TableCell>
                            <TableCell className="text-xs">{trade.symbol}</TableCell>
                            <TableCell className="text-xs">{trade.setup}</TableCell>
                            <TableCell className="text-xs">{trade.rMultiple}</TableCell>
                            <TableCell className="text-xs">{trade.notes}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button 
                  className="mt-3" 
                  size="sm"
                  onClick={onAddTrade}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Manual Trade
                </Button>
              </div>

              {/* Performance by Bot */}
              <div>
                <h3 className="text-sm font-medium mb-3">Performance by Bot</h3>
                <div className="space-y-2">
                  {botPerformance.map((bot) => (
                    <div 
                      key={bot.name}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{bot.name}:</span>
                      </div>
                      <span className={`text-sm font-medium ${bot.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                        P&L
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bot Integration Settings */}
                <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Bot Integration Settings & Notes</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        (Add API keys and bot names for comprehensive tracking)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="automated" className="mt-0">
            <div className="text-center text-muted-foreground py-8">
              No automated bot data available. Configure bot integrations below.
            </div>
          </TabsContent>

          <TabsContent value="combined" className="mt-0">
            <div className="text-center text-muted-foreground py-8">
              Combined view will show all trades from manual entries and automated bots.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
