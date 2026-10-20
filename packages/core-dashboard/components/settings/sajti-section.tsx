"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import { Switch } from "@core/components/ui/switch"
import { Loader2, MapPin, Megaphone } from "lucide-react"
import { toast } from "sonner"
import {
  getContactInfo, updateContactInfo, getAnnouncement, updateAnnouncement,
  type ContactInfo, type AnnouncementBanner,
} from "@core/lib/api/site-content"

export function SajtiSection() {
  const t = useTranslations('sajti-section')
  const [contact, setContact] = useState<ContactInfo>({ address: "", phone: "", email: "", hours: "" })
  const [announcement, setAnnouncement] = useState<AnnouncementBanner>({ message: "", isActive: false })
  const [loading, setLoading] = useState(true)
  const [savingContact, setSavingContact] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  useEffect(() => {
    Promise.all([getContactInfo(), getAnnouncement()])
      .then(([c, a]) => { setContact(c); setAnnouncement(a) })
      .catch(() => toast.error("Gabim gjatë ngarkimit"))
      .finally(() => setLoading(false))
  }, [])

  const saveContact = async () => {
    setSavingContact(true)
    try {
      const updated = await updateContactInfo(contact)
      setContact(updated)
      toast.success("Të dhënat e kontaktit u ruajtën me sukses")
    } catch {
      toast.error("Gabim gjatë ruajtjes")
    } finally {
      setSavingContact(false)
    }
  }

  const saveAnnouncement = async () => {
    setSavingAnnouncement(true)
    try {
      const updated = await updateAnnouncement(announcement)
      setAnnouncement(updated)
      toast.success("Njoftimi u ruajt me sukses")
    } catch {
      toast.error("Gabim gjatë ruajtjes")
    } finally {
      setSavingAnnouncement(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-accent" />
            {t('contact.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('contact.description')}
          </p>
          <div className="space-y-2">
            <Label htmlFor="address">{t('contact.addressLabel')}</Label>
            <Input id="address" value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} placeholder={t('contact.addressPlaceholder')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('contact.phoneLabel')}</Label>
              <Input id="phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+355 6X XXX XXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('contact.emailLabel')}</Label>
              <Input id="email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="info@klinika.al" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">{t('contact.hoursLabel')}</Label>
            <Textarea id="hours" value={contact.hours} onChange={(e) => setContact({ ...contact, hours: e.target.value })} placeholder={t('contact.hoursPlaceholder')} />
          </div>
          <Button onClick={saveContact} disabled={savingContact} className="bg-accent hover:bg-accent/90">
            {savingContact && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-5 w-5 text-accent" />
            {t('announcement.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('announcement.description')}
          </p>
          <div className="space-y-2">
            <Label htmlFor="announcement">{t('announcement.messageLabel')}</Label>
            <Textarea id="announcement" value={announcement.message} onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })} placeholder={t('announcement.messagePlaceholder')} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="announcement-active">{t('announcement.activeLabel')}</Label>
            <Switch id="announcement-active" checked={announcement.isActive} onCheckedChange={(v) => setAnnouncement({ ...announcement, isActive: v })} />
          </div>
          <Button onClick={saveAnnouncement} disabled={savingAnnouncement} className="bg-accent hover:bg-accent/90">
            {savingAnnouncement && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('saveChanges')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
