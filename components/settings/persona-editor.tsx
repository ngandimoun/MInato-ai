
//components/settings/persona-editor.tsx

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PersonaEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PersonaEditor({ open, onOpenChange }: PersonaEditorProps) {
  const [name, setName] = useState("Default")
  const [description, setDescription] = useState("Helpful, friendly, and knowledgeable assistant")
  const [personality, setPersonality] = useState("balanced")
  const [tone, setTone] = useState("friendly")
  const [expertise, setExpertise] = useState("general")

  const handleSave = () => {
    // Save persona settings
    onOpenChange(false)
  }

  const handleReset = () => {
    setName("Default")
    setDescription("Helpful, friendly, and knowledgeable assistant")
    setPersonality("balanced")
    setTone("friendly")
    setExpertise("general")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Persona</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="personality">Personality</Label>
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger id="personality">
                <SelectValue placeholder="Select personality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="empathetic">Empathetic</SelectItem>
                <SelectItem value="precise">Precise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tone">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expertise">Primary Expertise</Label>
            <Select value={expertise} onValueChange={setExpertise}>
              <SelectTrigger id="expertise">
                <SelectValue placeholder="Select expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Knowledge</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="arts">Arts & Culture</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="health">Health & Wellness</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}