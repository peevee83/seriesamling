"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export const dynamic = "force-dynamic"


function InfoChip({ label, value }) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900">
        {isEmpty ? "—" : value}
      </div>
    </div>
  )
}


function getConditionBadge(condition) {
  switch (condition) {
    case "Mint":
    case "Near Mint":
      return "bg-emerald-100 text-emerald-700"

    case "Very Fine":
      return "bg-blue-100 text-blue-800"

    case "Fine":
      return "bg-yellow-100 text-yellow-800"

    case "Very Good":
    case "Good":
      return "bg-orange-100 text-orange-800"

    case "Fair":
    case "Poor":
      return "bg-red-100 text-red-800"

    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function Home() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [comics, setComics] = useState([])
  const [series, setSeries] = useState("")
  const [issue, setIssue] = useState("")
  const [year, setYear] = useState("")
  const [condition, setCondition] = useState("")
  const [estimatedValue, setEstimatedValue] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [filterSeries, setFilterSeries] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedComic, setSelectedComic] = useState(null)
  const [editComic, setEditComic] = useState(null)
  const [newCoverFile, setNewCoverFile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [title, setTitle] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const [totalSeries, setTotalSeries] = useState(0)
  const [availableSeries, setAvailableSeries] = useState([])
  const [showLightbox, setShowLightbox] = useState(false)
  const [description, setDescription] = useState("")
  const [author, setAuthor] = useState("")
  const [artist, setArtist] = useState("")
  const [publisher, setPublisher] = useState("")
  const [language, setLanguage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authMode, setAuthMode] = useState("login") // "login" | "signup"
  const [activeView, setActiveView] = useState("album") // dashboard | album | stats
  const [statsComics, setStatsComics] = useState([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [rating, setRating] = useState(0)
  const [addCoverPreview, setAddCoverPreview] = useState(null)

function resetAddForm() {
  setSeries("")
  setTitle("")
  setIssue("")
  setYear("")
  setCondition("")
  setEstimatedValue("")
  setCoverFile(null)
  setAddCoverPreview(null)

  setDescription("")
  setAuthor("")
  setArtist("")
  setPublisher("")
  setLanguage("")

  setRating(0)
}


function StarRating({ value = 0, onChange, size = 20 }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => {
        const star = i + 1
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={`transition ${
              star <= value ? "text-yellow-400" : "text-slate-300"
            }`}
            style={{ fontSize: size }}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}


// ===== Statistik-helpers =====
function groupCount(items, keyFn) {
  const map = new Map()
  for (const it of items) {
    const key = (keyFn(it) || "").toString().trim()
    if (!key) continue
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

function groupSum(items, keyFn, valFn) {
  const map = new Map()
  for (const it of items) {
    const key = (keyFn(it) || "").toString().trim()
    if (!key) continue
    const val = Number(valFn(it)) || 0
    map.set(key, (map.get(key) || 0) + val)
  }
  return Array.from(map.entries())
    .map(([key, sum]) => ({ key, sum }))
    .sort((a, b) => b.sum - a.sum)
}

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

const totalItemsAll = totalCount || comics.length // total i databasen (om totalCount finns)
const statsTotalValue = statsComics.reduce(
  (sum, c) => sum + (Number(c.estimated_value) || 0),
  0
)

const rated = statsComics.filter((c) => c.rating)
const statsAvgRating =
  rated.length > 0
    ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1)
    : "—"



const statsTotalItems = statsComics.length

const statsTotalSeries =
  new Set(
    statsComics
      .map((c) => c.series?.trim().toLowerCase())
      .filter(Boolean)
  ).size

const statsAvgValue =
  statsTotalItems > 0 ? Math.round(statsTotalValue / statsTotalItems) : 0

// Top 8 dyraste (baserat på comics i state)
const topValuable = [...statsComics]
  .sort((a, b) => (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0))
  .slice(0, 8)

const issuesPerSeries = groupCount(statsComics, (c) => c.series).slice(0, 8)
const byLanguage = groupCount(statsComics, (c) => c.language).slice(0, 8)
const byPublisher = groupCount(statsComics, (c) => c.publisher).slice(0, 8)
const byCondition = groupCount(statsComics, (c) => c.condition).slice(0, 8)

const valueBySeries = groupSum(statsComics, (c) => c.series, (c) => c.estimated_value).slice(0, 8)
const valueByPublisher = groupSum(statsComics, (c) => c.publisher, (c) => c.estimated_value).slice(0, 8)


function StatCard({ label, value, hint }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-sm text-slate-500">{hint}</div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
    </div>
  )
}

async function fetchStatsComics() {
  setStatsLoading(true)

  const { data, error } = await supabase
    .from("comics")
    .select(`
      id,
      series,
      title,
      issue_number,
      year,
      condition,
      estimated_value,
      language,
      publisher,
      rating
    `)

  if (error) {
    console.log("Stats fetch error:", error)
    setStatsComics([])
  } else {
    setStatsComics(data || [])
  }

  setStatsLoading(false)
}


function BarRow({ label, value, maxValue, right }) {
  const width = maxValue ? Math.max(6, Math.round((value / maxValue) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-sm font-semibold text-slate-800">
            {label}
          </div>
          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {right}
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className="h-2 rounded-full bg-slate-900 transition-all"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    </div>
  )
}


async function handleAuth(e) {
  e?.preventDefault?.()
  setAuthError("")
  setAuthLoading(true)

  const { error } =
    authMode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

  setAuthLoading(false)
  if (error) setAuthError(error.message)
}

  const CONDITION_OPTIONS = [
  { value: "Mint", label: "Mint (M)" },
  { value: "Near Mint", label: "Near Mint (NM)" },
  { value: "Very Fine", label: "Very Fine (VF)" },
  { value: "Fine", label: "Fine (FN)" },
  { value: "Very Good", label: "Very Good (VG)" },
  { value: "Good", label: "Good (G)" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" }
]

useEffect(() => {
  if (!session) return
  if (activeView !== "stats") return

  // hämta bara om vi inte redan har data
  if (statsComics.length === 0 && !statsLoading) {
    fetchStatsComics()
  }
}, [activeView, session])


useEffect(() => {
  function onKeyDown(e) {
    if (e.key === "Escape") {
      setShowLightbox(false)
      setSelectedComic(null)
    }
  }

  window.addEventListener("keydown", onKeyDown)
  return () => window.removeEventListener("keydown", onKeyDown)
}, [])


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

useEffect(() => {
  fetchComics()
  fetchTotalCount()
}, [filterSeries, filterYear, sortBy, sortOrder])

useEffect(() => {
  refreshData()
}, [])

async function fetchTotalSeries() {
  const { data, error } = await supabase
    .from("comics")
    .select("series")

  if (!error && data) {
    const unique = new Set(
      data.map(item =>
        item.series?.trim().toLowerCase()
      )
    )

    setTotalSeries(unique.size)
  }
}

async function fetchAvailableSeries() {
  const { data, error } = await supabase
    .from("comics")
    .select("series")

  if (!error && data) {
    const unique = [
      ...new Set(
        data
          .map((item) => item.series?.trim())
          .filter(Boolean)
      )
    ].sort()

    setAvailableSeries(unique)
  }
}


  async function login() {
    await supabase.auth.signInWithPassword({
      email,
      password
    })
  }

async function refreshData() {
  await fetchComics()          // albumlistan (påverkas av filter)
  await fetchTotalCount()      // total count (hela DB)
  await fetchTotalSeries()     // hela DB
  await fetchAvailableSeries() // dropdown (hela DB)
}


  async function logout() {
    await supabase.auth.signOut()
  }

async function fetchComics() {
  let query = supabase.from("comics").select("*")

  // Filtrering
  if (filterSeries) {
  query = query.eq("series", filterSeries)
}


  if (filterYear) {
    query = query.eq("year", filterYear)
  }

  // Sortering
  query = query.order(sortBy, {
    ascending: sortOrder === "asc"
  })

  const { data } = await query
  setComics(data || [])
}

async function fetchTotalCount() {
  const { count, error } = await supabase
    .from("comics")
    .select("*", { count: "exact", head: true })

  if (!error) {
    setTotalCount(count || 0)
  }
}

async function addComic() {
  let coverUrl = null

  if (coverFile) {
    const fileName = `${Date.now()}-${coverFile.name}`

    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from("covers")
        .upload(fileName, coverFile)

    if (uploadError) {
      console.log("Upload error:", uploadError)
    } else {
      const { data } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName)

      coverUrl = data.publicUrl
    }
  }

const { error } = await supabase.from("comics").insert([
  {
    series,
    title,
    issue_number: issue,
    year,
    condition,
    estimated_value: estimatedValue,
    cover_url: coverUrl,

    description,
    author,
    artist,
    publisher,
    language,
    rating: rating || null
  }
])



  if (error) {
    console.log("Insert error:", error)
  }

  await refreshData()
}



async function deleteComic(comic) {
  // 1. Ta bort bild från storage om den finns
  if (comic.cover_url) {
    const fileName = comic.cover_url.split("/").pop()

    await supabase.storage
      .from("covers")
      .remove([fileName])
  }

  // 2. Ta bort från databasen
  await supabase
    .from("comics")
    .delete()
    .eq("id", comic.id)

  await refreshData()
}

async function updateComic() {
  let updatedCoverUrl = editComic.cover_url

  // Om ny bild valts
  if (newCoverFile) {
    const fileName = `${Date.now()}-${newCoverFile.name}`

    // 1. Ladda upp ny bild
    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(fileName, newCoverFile)

    if (uploadError) {
      console.log("Upload error:", uploadError)
      return
    }

    // 2. Hämta public URL
    const { data } = supabase.storage
      .from("covers")
      .getPublicUrl(fileName)

    updatedCoverUrl = data.publicUrl

    // 3. Ta bort gammal bild
    if (editComic.cover_url) {
      const oldFileName = editComic.cover_url.split("/").pop()

      await supabase.storage
        .from("covers")
        .remove([oldFileName])
    }
  }

  // 4. Uppdatera databasen
const { error } = await supabase
  .from("comics")
  .update({
    series: editComic.series,
    title: editComic.title,
    issue_number: editComic.issue_number,
    year: editComic.year,
    condition: editComic.condition,
    estimated_value: editComic.estimated_value,
    cover_url: updatedCoverUrl,
    author: editComic.author,
    artist: editComic.artist,
    publisher: editComic.publisher,
    language: editComic.language,
    description: editComic.description,
    rating: editComic.rating ?? null
  })
  .eq("id", editComic.id)


  if (error) {
    console.log("Update error:", error)
  }

  setSelectedComic(null)
  setNewCoverFile(null)
  await refreshData()
}




  const totalValue = comics.reduce(
    (sum, comic) => sum + (Number(comic.estimated_value) || 0),
    0
  )

  const totalComics = comics.length


const averageValue =
  totalComics > 0 ? Math.round(totalValue / totalComics) : 0

const mostValuable = comics.reduce((max, comic) => {
  if (!max) return comic
  return Number(comic.estimated_value) > Number(max.estimated_value)
    ? comic
    : max
}, null)


if (!session) {
  async function handleLogin(e) {
    e?.preventDefault?.()
    setAuthError("")
    setAuthLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setAuthLoading(false)
    if (error) setAuthError(error.message)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      {/* glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-20 h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xl">
                📚
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Logga in
                </h1>
                <p className="text-sm text-white/60 mt-1">
                  Hantera din seriesamling på ett ställe.
                </p>
              </div>
            </div>

<form onSubmit={handleAuth} className="mt-8 space-y-4">
  <div>
    <label className="text-xs font-semibold text-white/70">E-post</label>
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="din@email.se"
      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-indigo-500/40"
      autoComplete="email"
    />
  </div>

  <div>
    <label className="text-xs font-semibold text-white/70">Lösenord</label>
    <div className="mt-2 relative">
      <input
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-indigo-500/40"
        autoComplete={authMode === "signup" ? "new-password" : "current-password"}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
      >
        {showPassword ? "Dölj" : "Visa"}
      </button>
    </div>
  </div>

  {authError && (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {authError}
    </div>
  )}

  <button
    type="submit"
    disabled={authLoading || !email || !password}
    className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 px-4 py-3 font-bold text-white shadow-lg shadow-indigo-700/25 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {authLoading
      ? (authMode === "signup" ? "Skapar konto..." : "Loggar in...")
      : (authMode === "signup" ? "Skapa konto" : "Logga in")}
  </button>

  {/* Toggle login/signup */}
  <div className="pt-2 text-center text-sm text-white/60">
    {authMode === "login" ? (
      <>
        Har du inget konto?{" "}
        <button
          type="button"
          onClick={() => {
            setAuthMode("signup")
            setAuthError("")
          }}
          className="font-semibold text-white hover:underline"
        >
          Skapa konto
        </button>
      </>
    ) : (
      <>
        Har du redan konto?{" "}
        <button
          type="button"
          onClick={() => {
            setAuthMode("login")
            setAuthError("")
          }}
          className="font-semibold text-white hover:underline"
        >
          Logga in
        </button>
      </>
    )}
  </div>

  {/* Liten hint vid signup */}
  {authMode === "signup" && (
    <div className="text-center text-xs text-white/45">
      Du kan behöva bekräfta e-post (beroende på dina Supabase-inställningar).
    </div>
  )}
</form>

          </div>

          <div className="border-t border-white/10 px-8 py-5">
            <div className="text-xs text-white/50">
              Säker inloggning via <span className="text-white/70 font-semibold">Supabase</span>.
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Min Seriesamling
        </div>
      </div>
    </div>
  )
}



  
  return (


    
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-10">
  <div className="max-w-6xl mx-auto">
<nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
  <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
    {/* Logo + title */}
    <button
      onClick={() => setActiveView("album")}
      className="flex items-center gap-3 group"
      type="button"
    >
      <img
        src="/logo.png"
        alt="Min Seriesamling"
        className="h-10 w-10 object-contain drop-shadow-md group-hover:scale-105 transition"
      />
      <div className="text-left">
        <div className="text-xl font-extrabold tracking-tight text-slate-900">
          Min Seriesamling
        </div>
        <div className="text-xs text-slate-500 -mt-0.5">
          Dashboard • Album • Statistik
        </div>
      </div>
    </button>

    {/* Menu */}
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 p-1 shadow-sm">
      {[
        { key: "dashboard", label: "Dashboard" },
        { key: "album", label: "Album" },
        { key: "stats", label: "Statistik" }
      ].map((item) => {
        const active = activeView === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveView(item.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              active
                ? "bg-slate-900 text-white shadow"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>

    {/* Right actions */}
    <div className="flex items-center gap-2">
      <button
        onClick={logout}
        className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition shadow"
      >
        Logga ut
      </button>
    </div>
  </div>
</nav>






  


{/* Content */}
<div className="max-w-6xl mx-auto px-6 py-8">
  {activeView === "dashboard" && (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">

  {/* Totalt värde */}
  <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-500 group">
  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
  <div className="text-slate-500 text-sm tracking-wide uppercase">Totalt värde</div>
  <div className="text-4xl font-extrabold mt-3 bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">
    {totalValue.toLocaleString()} kr
  </div>

</div>


  {/* Antal serier */}
   <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-500 group">
  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
     <div className="text-slate-500 text-sm tracking-wide uppercase">Antal serier</div>
    <div className="text-4xl font-extrabold text-slate-800 mt-2">
      {totalSeries}
    </div>
  </div>

  {/* Unika titlar */}
 <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-500 group">
  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
     <div className="text-slate-500 text-sm tracking-wide uppercase">Unika titlar</div>
    <div className="text-4xl font-extrabold text-slate-800 mt-2">
      {totalCount} 
    </div>
  </div>

  {/* Genomsnittligt värde */}
 <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-500 group">
  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
     <div className="text-slate-500 text-sm tracking-wide uppercase">Snittvärde</div>
    <div className="text-4xl font-extrabold text-indigo-600 mt-2">
      {averageValue.toLocaleString()} kr
    </div>
  </div>

</div>
    </>
  )}

  {activeView === "album" && (
    <>

<div className="mb-6 flex flex-wrap gap-4">

<select
  value={filterSeries}
  onChange={(e) => setFilterSeries(e.target.value)}
  className="border border-slate-200 bg-white/70 backdrop-blur-lg rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 transition"
>
  <option value="">Alla serier</option>

  {availableSeries.map((serie) => (
    <option key={serie} value={serie}>
      {serie}
    </option>
  ))}
</select>

  <input
    type="number"
    placeholder="Filtrera år..."
    value={filterYear}
    onChange={(e) => setFilterYear(e.target.value)}
    className="border border-slate-200 bg-white/70 backdrop-blur-lg rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 transition"
  />

  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="border border-slate-200 bg-white/70 backdrop-blur-lg rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 transition"
  >
    <option value="created_at">Senast tillagd</option>
    <option value="series">Serie</option>
	<option value="issue_number">Nummer</option>
    <option value="year">År</option>
    <option value="estimated_value">Värde</option>
	
  </select>

  <select
    value={sortOrder}
    onChange={(e) => setSortOrder(e.target.value)}
    className="border border-slate-200 bg-white/70 backdrop-blur-lg rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 transition"
  >
    <option value="desc">Fallande</option>
    <option value="asc">Stigande</option>
  </select>

</div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

  {comics.map((comic) => (
<div
  key={comic.id}
onClick={() => {
  setSelectedComic(comic)
  setEditComic(comic)
  setEditMode(false)
}}


  className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
>


      <div className="relative">
  <img
    src={comic.cover_url}
    alt="Omslag"
    className="w-full h-90 object-cover"
  />

  <span
    className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold shadow ${getConditionBadge(
      comic.condition
    )}`}
  >
    {comic.condition}
  </span>
</div>


      <div className="p-4">
        <h3 className="font-bold text-lg">
          {comic.title}
        </h3>
 
       <p className="text-sm text-slate-500">
        {comic.series}
       </p>
    
      <p className="text-sm text-slate-500">
        {comic.year}
       </p>

       <div className="mt-2">
  <StarRating value={comic.rating} size={14} />
</div>

      </div>

    </div>
  ))}

</div>

<button
  onClick={() => setShowAddModal(true)}
  className="fixed bottom-8 right-75 bg-gradient-to-br from-slate-900 to-black text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 hover:rotate-90 transition-all duration-300 z-50"
>
  +
</button>

    </>
  )}

{activeView === "stats" && (
  <div className="space-y-8">
    {/* Header */}
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Statistik
        </h2>
        <p className="text-slate-600">
          Överblick och topplistor för din samling.
        </p>
      </div>

    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
<StatCard
  label="Totalt värde"
  value={`${statsTotalValue.toLocaleString()} kr`}
/>

<StatCard
  label="Antal titlar (poster)"
  value={statsTotalItems.toLocaleString()}
/>

<StatCard
  label="Antal serier"
  value={statsTotalSeries.toLocaleString()}
/>

<StatCard
  label="Snittbetyg"
  value={`${statsAvgRating} ⭐`}
/>


<StatCard
  label="Snittvärde"
  value={`${statsAvgValue.toLocaleString()} kr`}
/>

    </div>

    {/* Top lists */}
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Dyraste */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">
            🏆 Dyraste i samlingen
          </h3>
          <div className="text-xs font-semibold text-slate-500">
            Top {topValuable.length}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {topValuable.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            topValuable.map((c, idx) => (
              <div
                key={c.id || `${c.series}-${c.issue_number}-${idx}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-900">
                    {c.title || "Utan titel"}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {c.series || "Okänd serie"} • #{c.issue_number || "—"} • {c.year || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-emerald-700">
                    {(Number(c.estimated_value) || 0).toLocaleString()} kr
                  </div>
                  <div
                    className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${getConditionBadge(
                      c.condition
                    )}`}
                  >
                    {c.condition || "Ej angivet"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Flest nummer per serie */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">
            📚 Flest nummer per serie
          </h3>
          <div className="text-xs font-semibold text-slate-500">
            Top {issuesPerSeries.length}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {issuesPerSeries.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            (() => {
              const max = issuesPerSeries[0]?.count || 0
              return issuesPerSeries.map((row) => (
                <BarRow
                  key={row.key}
                  label={row.key}
                  value={row.count}
                  maxValue={max}
                  right={`${row.count} st`}
                />
              ))
            })()
          )}
        </div>
      </div>
    </div>

    {/* Distributions */}
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Språk */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">🌍 Språk</h3>
        <div className="mt-5 space-y-4">
          {byLanguage.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            (() => {
              const max = byLanguage[0]?.count || 0
              const total = statsTotalItems || 0
              return byLanguage.map((row) => (
                <BarRow
                  key={row.key}
                  label={row.key}
                  value={row.count}
                  maxValue={max}
                  right={`${pct(row.count, total)}%`}
                />
              ))
            })()
          )}
        </div>
      </div>

      {/* Förlag */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">🏢 Förlag</h3>
        <div className="mt-5 space-y-4">
          {byPublisher.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            (() => {
              const max = byPublisher[0]?.count || 0
              const total = statsTotalItems || 0
              return byPublisher.map((row) => (
                <BarRow
                  key={row.key}
                  label={row.key}
                  value={row.count}
                  maxValue={max}
                  right={`${pct(row.count, total)}%`}
                />
              ))
            })()
          )}
        </div>
      </div>

      {/* Skick */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">✅ Skick</h3>
        <div className="mt-5 space-y-4">
          {byCondition.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            (() => {
              const max = byCondition[0]?.count || 0
              const total = statsTotalItems || 0
              return byCondition.map((row) => (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getConditionBadge(
                        row.key
                      )}`}
                    >
                      {row.key}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {row.count} st • {pct(row.count, total)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{
                        width: `${max ? Math.max(6, Math.round((row.count / max) * 100)) : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))
            })()
          )}
        </div>
      </div>
    </div>

    {/* Value leaders */}
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Värde per serie */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">💸 Mest värde per serie</h3>
          <div className="text-xs font-semibold text-slate-500">
            Top {valueBySeries.length}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {valueBySeries.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            (() => {
              const max = valueBySeries[0]?.sum || 0
              return valueBySeries.map((row) => (
                <BarRow
                  key={row.key}
                  label={row.key}
                  value={row.sum}
                  maxValue={max}
                  right={`${Math.round(row.sum).toLocaleString()} kr`}
                />
              ))
            })()
          )}
        </div>
      </div>

      {/* Värde per förlag */}
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">🏛️ Mest värde per förlag</h3>
          <div className="text-xs font-semibold text-slate-500">
            Top {valueByPublisher.length}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {valueByPublisher.length === 0 ? (
            <div className="text-slate-500">Ingen data ännu.</div>
          ) : (
            (() => {
              const max = valueByPublisher[0]?.sum || 0
              return valueByPublisher.map((row) => (
                <BarRow
                  key={row.key}
                  label={row.key}
                  value={row.sum}
                  maxValue={max}
                  right={`${Math.round(row.sum).toLocaleString()} kr`}
                />
              ))
            })()
          )}
        </div>
      </div>
    </div>
  </div>
)}

</div>



{selectedComic && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
    onClick={() => setSelectedComic(null)}
  >
    <div
      className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/85 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
      onClick={(e) => e.stopPropagation()}
    >
{/* Header */}
<div className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
  <div className="flex items-start justify-between gap-4 p-5">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900">
          {(editMode ? editComic?.title : selectedComic.title) || "Utan titel"}
        </h2>

        {/* Skick */}
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getConditionBadge(
            (editMode ? editComic?.condition : selectedComic.condition) || ""
          )}`}
        >
          {(editMode ? editComic?.condition : selectedComic.condition) || "Ej angivet"}
        </span>

        {/* Serie */}
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {(editMode ? editComic?.series : selectedComic.series) || "Okänd serie"}
        </span>

        {/* Betyg */}
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          <span className="text-slate-500">Betyg</span>

          {editMode ? (
            <StarRating
              value={editComic?.rating || 0}
              onChange={(val) => setEditComic({ ...editComic, rating: val })}
              size={16}
            />
          ) : (
            <StarRating value={selectedComic.rating || 0} size={16} />
          )}

          <span className="text-slate-500">
            {((editMode ? editComic?.rating : selectedComic.rating) || 0)
              ? `${editMode ? editComic?.rating : selectedComic.rating}/5`
              : "—"}
          </span>
        </span>
      </div>

      {/* Subline */}
      <div className="mt-1 text-sm text-slate-500">
        {((editMode ? editComic?.series : selectedComic.series) || "—")}
        {(editMode ? editComic?.issue_number : selectedComic.issue_number) ? (
          <>
            <span className="mx-2 text-slate-300">•</span>#
            {editMode ? editComic?.issue_number : selectedComic.issue_number}
          </>
        ) : null}
        {(editMode ? editComic?.year : selectedComic.year) ? (
          <>
            <span className="mx-2 text-slate-300">•</span>
            {editMode ? editComic?.year : selectedComic.year}
          </>
        ) : null}
        {(editMode ? editComic?.publisher : selectedComic.publisher) ? (
          <>
            <span className="mx-2 text-slate-300">•</span>
            {editMode ? editComic?.publisher : selectedComic.publisher}
          </>
        ) : null}
        {(editMode ? editComic?.language : selectedComic.language) ? (
          <>
            <span className="mx-2 text-slate-300">•</span>
            {editMode ? editComic?.language : selectedComic.language}
          </>
        ) : null}
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditMode(!editMode)}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        type="button"
      >
        {editMode ? "Visa" : "Redigera"}
      </button>

      <button
        onClick={() => setSelectedComic(null)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        aria-label="Stäng"
        type="button"
      >
        ✕
      </button>
    </div>
  </div>
</div>


      {/* Content */}
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[420px_1fr]">
        {/* Left: Cover */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {selectedComic.cover_url ? (
  <button
    type="button"
    onClick={() => setShowLightbox(true)}
    className="group relative block w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    title="Klicka för att zooma"
  >
    <img
      src={selectedComic.cover_url}
      alt="Omslag"
      className="h-[520px] w-full object-contain bg-gradient-to-b from-slate-50 to-white"
    />

    {/* Hover overlay */}
    <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow opacity-0 group-hover:opacity-100 transition">
      Klicka för fullscreen
    </div>
  </button>
) : (
  <div className="flex h-[520px] items-center justify-center text-slate-500">
    Ingen bild
  </div>
)}

          </div>

          {!editMode && (
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Värde
              </div>
              <div className="mt-2 text-3xl font-extrabold text-emerald-600">
                {Number(selectedComic.estimated_value || 0).toLocaleString()} kr
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Uppskattat marknadsvärde
              </div>
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-5">
          {!editMode ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoChip label="Serie" value={selectedComic.series} />
                <InfoChip label="Titel" value={selectedComic.title} />
                <InfoChip label="Nummer" value={`#${selectedComic.issue_number || "—"}`} />
                <InfoChip label="År" value={selectedComic.year} />

              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">

                  
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Skick
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getConditionBadge(
                          selectedComic.condition
                        )}`}
                      >
                        {selectedComic.condition || "Ej angivet"}
                      </span>
                    </div>
                  


              </div>
              {/* Nya fält (visa-läge) */}
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
  <InfoChip label="Författare" value={selectedComic.author} />
  <InfoChip label="Tecknare" value={selectedComic.artist} />
  <InfoChip label="Förlag" value={selectedComic.publisher} />
  <InfoChip label="Språk" value={selectedComic.language} />
</div>

{/* Beskrivning */}
<div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
  <div className="text-xs uppercase tracking-wide text-slate-500">
    Beskrivning
  </div>
  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
    {selectedComic.description || "—"}
  </div>
</div>

            </>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Serie
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={editComic?.series || ""}
                      onChange={(e) =>
                        setEditComic({ ...editComic, series: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Titel
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={editComic?.title || ""}
                      onChange={(e) =>
                        setEditComic({ ...editComic, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Nummer
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={editComic?.issue_number || ""}
                      onChange={(e) =>
                        setEditComic({
                          ...editComic,
                          issue_number: e.target.value
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      År
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={editComic?.year || ""}
                      onChange={(e) =>
                        setEditComic({ ...editComic, year: e.target.value })
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Skick
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={editComic?.condition || ""}
                      onChange={(e) =>
                        setEditComic({
                          ...editComic,
                          condition: e.target.value
                        })
                      }
                    >
                      <option value="">Välj skick</option>
                      {CONDITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
  placeholder="Författare"
  value={editComic?.author || ""}
  onChange={(e) =>
    setEditComic({ ...editComic, author: e.target.value })
  }
/>

<input
  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
  placeholder="Tecknare"
  value={editComic?.artist || ""}
  onChange={(e) =>
    setEditComic({ ...editComic, artist: e.target.value })
  }
/>

<input
  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
  placeholder="Förlag"
  value={editComic?.publisher || ""}
  onChange={(e) =>
    setEditComic({ ...editComic, publisher: e.target.value })
  }
/>

<select
  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
  value={editComic?.language || ""}
  onChange={(e) =>
    setEditComic({ ...editComic, language: e.target.value })
  }
>
  <option value="">Språk</option>
  <option value="Svenska">Svenska</option>
  <option value="Engelska">Engelska</option>
  <option value="Japanska">Japanska</option>
  <option value="Franska">Franska</option>
  <option value="Tyska">Tyska</option>
</select>

<textarea
  className="mt-1 w-full min-h-[110px] rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
  placeholder="Beskrivning"
  value={editComic?.description || ""}
  onChange={(e) =>
    setEditComic({ ...editComic, description: e.target.value })
  }
/>

<div className="sm:col-span-2">
  <label className="text-xs font-semibold text-slate-600">
    Betyg
  </label>
  <StarRating
    value={editComic?.rating || 0}
    onChange={(val) =>
      setEditComic({ ...editComic, rating: val })
    }
  />
</div>


                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Värde (kr)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={editComic?.estimated_value || ""}
                      onChange={(e) =>
                        setEditComic({
                          ...editComic,
                          estimated_value: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Byt omslagsbild
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewCoverFile(e.target.files[0])}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={updateComic}
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  Spara ändringar
                </button>

                <button
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Är du säker på att du vill radera denna serie?"
                    )
                    if (confirmed) {
                      deleteComic(editComic)
                      setSelectedComic(null)
                    }
                  }}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition"
                >
                  Radera
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
)}

{showLightbox && (selectedComic?.cover_url || addCoverPreview) && (
  <div
    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    onClick={() => setShowLightbox(false)}
  >
    <button
      className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl"
      onClick={() => setShowLightbox(false)}
      aria-label="Stäng"
      type="button"
    >
      ✕
    </button>

    <img
      src={selectedComic?.cover_url || addCoverPreview}
      alt="Omslag fullscreen"
      className="max-h-[92vh] max-w-[92vw] object-contain rounded-2xl shadow-[0_30px_120px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}

{showAddModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
    onClick={() => setShowAddModal(false)}
  >
    <div
      className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/85 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
      onClick={(e) => e.stopPropagation()}
    >
{/* Header */}
<div className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
  <div className="flex items-start justify-between gap-4 p-5">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900">
          {title?.trim() ? title : "Lägg till serie"}
        </h2>

        {/* Skick */}
        {condition ? (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getConditionBadge(
              condition
            )}`}
          >
            {condition}
          </span>
        ) : null}

        {/* Serie */}
        {series?.trim() ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {series}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Ny post
          </span>
        )}

        {/* Betyg */}
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          <span className="text-slate-500">Betyg</span>
          <StarRating value={rating} onChange={setRating} size={16} />
          <span className="text-slate-500">
            {rating ? `${rating}/5` : "—"}
          </span>
        </span>
      </div>

      {/* Subline */}
      <div className="mt-1 text-sm text-slate-500">
        <span className="font-semibold text-slate-700">
          {series?.trim() ? series : "—"}
        </span>
        {issue?.toString().trim() ? (
          <>
            <span className="mx-2 text-slate-300">•</span>#{issue}
          </>
        ) : null}
        {year?.toString().trim() ? (
          <>
            <span className="mx-2 text-slate-300">•</span>
            {year}
          </>
        ) : null}
        {publisher?.trim() ? (
          <>
            <span className="mx-2 text-slate-300">•</span>
            {publisher}
          </>
        ) : null}
        {language?.trim() ? (
          <>
            <span className="mx-2 text-slate-300">•</span>
            {language}
          </>
        ) : null}
      </div>
    </div>

    <div className="flex items-center gap-2">
<button
  onClick={() => {
    resetAddForm()
    setShowAddModal(false)
  }}
  className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
>
  ✕
</button>

    </div>
  </div>
</div>


      {/* Content */}
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[420px_1fr]">
        {/* Left: Cover */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {addCoverPreview ? (
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                className="group relative block w-full overflow-hidden rounded-3xl"
                title="Klicka för fullscreen"
              >
                <img
                  src={addCoverPreview}
                  alt="Omslags-preview"
                  className="h-[520px] w-full object-contain bg-gradient-to-b from-slate-50 to-white"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow opacity-0 group-hover:opacity-100 transition">
                  Klicka för fullscreen
                </div>
              </button>
            ) : (
              <div className="flex h-[520px] flex-col items-center justify-center gap-2 text-slate-500">
                <div className="text-sm font-semibold">Ingen bild vald</div>
                <div className="text-xs text-slate-400">
                  Välj omslag för att se preview
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Snabbinfo
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <InfoChip label="Serie" value={series} />
              <InfoChip label="Titel" value={title} />
              <InfoChip label="År" value={year} />
              <InfoChip label="Nummer" value={issue ? `#${issue}` : ""} />
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Serie */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Serie
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="t.ex. Spider-Man"
                />
              </div>

              {/* Titel */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Titel
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="t.ex. The Amazing..."
                />
              </div>

              {/* Nummer */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nummer
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="t.ex. 1"
                />
              </div>

              {/* År */}
              <div>
                <label className="text-xs font-semibold text-slate-600">År</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="t.ex. 1994"
                />
              </div>

              {/* Skick */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Skick
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="">Välj skick</option>
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Författare */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Författare
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="t.ex. Alan Moore"
                />
              </div>

              {/* Tecknare */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Tecknare
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="t.ex. Frank Miller"
                />
              </div>

              {/* Förlag */}
              <div>
                <label className="text-xs font-semibold text-slate-600">Förlag</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="t.ex. Marvel"
                />
              </div>

              {/* Språk */}
              <div>
                <label className="text-xs font-semibold text-slate-600">Språk</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="">Välj språk</option>
                  <option value="Svenska">Svenska</option>
                  <option value="Engelska">Engelska</option>
                  <option value="Japanska">Japanska</option>
                  <option value="Franska">Franska</option>
                  <option value="Tyska">Tyska</option>
                </select>
              </div>

              {/* Beskrivning */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Beskrivning
                </label>
                <textarea
                  className="mt-1 w-full min-h-[110px] rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kort beskrivning..."
                />
              </div>

              {/* Betyg */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Betyg</label>
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <StarRating value={rating} onChange={setRating} size={22} />
                  <div className="text-sm font-semibold text-slate-700">
                    {rating ? `${rating}/5` : "—"}
                  </div>
                </div>
              </div>

              {/* Värde */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Värde (kr)
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="t.ex. 250"
                />
              </div>

              {/* Omslagsbild */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Omslagsbild
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setCoverFile(f || null)
                    setAddCoverPreview(f ? URL.createObjectURL(f) : null)
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
await addComic()
resetAddForm()
setShowAddModal(false)

              }}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Spara serie
            </button>

<button
  onClick={() => {
    resetAddForm()
    setShowAddModal(false)
  }}
  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
>
  Avbryt
</button>

          </div>
        </div>
      </div>
    </div>
  </div>
)}



</div>

</div>

  )
}
