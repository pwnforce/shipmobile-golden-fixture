// A deliberately HIGH-CONTRAST, visibly-rendered screen. The no-white-screen smoke
// gate (assert-not-blank.js) asserts the emulator screenshot is NOT a single flat
// color, so this app must paint real, varied, high-contrast UI — never a blank page.
export default function App() {
  return (
    <div className="min-h-screen bg-indigo-700 text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">ShipMobile</h1>
      <p className="text-lg text-indigo-100">Golden fixture — the no-white-screen gate.</p>
      <div className="flex gap-4">
        <div className="h-20 w-20 rounded-lg bg-amber-400" />
        <div className="h-20 w-20 rounded-lg bg-emerald-400" />
        <div className="h-20 w-20 rounded-lg bg-rose-500" />
      </div>
      <button className="rounded-md bg-white px-6 py-3 font-semibold text-indigo-700">
        Tap target (44px+ min)
      </button>
    </div>
  )
}
