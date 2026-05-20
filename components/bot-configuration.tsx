"use client"

import { useState } from "react"
import { Settings, Database, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BotField {
  id: string
  name: string
  type: string
}

export function BotConfiguration() {
  const [botName, setBotName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [strategy, setStrategy] = useState("")
  const [customFields, setCustomFields] = useState<BotField[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  const handleTestConnection = () => {
    setIsConnecting(true)
    setTimeout(() => setIsConnecting(false), 1500)
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4 text-primary" />
          Bot Integration Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name" className="text-sm">Bot Name</Label>
            <Input
              id="bot-name"
              placeholder="Enter bot name..."
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-sm">Exchange API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-input border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Select Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Select strategy..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ema">EMA Crossover</SelectItem>
                <SelectItem value="rsi">RSI Divergence</SelectItem>
                <SelectItem value="macd">MACD Momentum</SelectItem>
                <SelectItem value="bollinger">Bollinger Bands</SelectItem>
                <SelectItem value="custom">Custom Strategy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleTestConnection}
              disabled={!botName || !apiKey || isConnecting}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isConnecting ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </div>

        {/* Custom Data Fields Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Bot-Specific Performance Data Fields</h3>
            <span className="text-xs text-muted-foreground">(for future testing)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Define new data</Label>
              <Input
                placeholder="Field name..."
                className="bg-input border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Fields</Label>
              <div className="flex flex-wrap gap-1">
                {customFields.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No custom fields defined</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
