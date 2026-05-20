import { Bell, Lock, Palette, Shield, Sliders } from 'lucide-react'

const SECTIONS = [
  { icon: Sliders, label: 'General', desc: 'System preferences and language' },
  { icon: Bell, label: 'Notifications', desc: 'Alerts, push, and email settings' },
  { icon: Shield, label: 'Security', desc: 'Password, 2FA, and access control' },
  { icon: Palette, label: 'Appearance', desc: 'Theme, colors, and layout' },
  { icon: Lock, label: 'Permissions', desc: 'Role management and access levels' },
]

export const SolarSettings = () => (
  <div className="se-section">
    <div className="se-section-head"><h2>Control Room</h2></div>
    <div className="se-settings-list">
      {SECTIONS.map(({ icon: Icon, label, desc }) => (
        <div key={label} className="se-settings-item">
          <div className="se-settings-icon"><Icon size={16} color="#4f6ef7" /></div>
          <div>
            <strong>{label}</strong>
            <p>{desc}</p>
          </div>
          <button type="button" className="se-btn-ghost">Configure</button>
        </div>
      ))}
    </div>
  </div>
)
