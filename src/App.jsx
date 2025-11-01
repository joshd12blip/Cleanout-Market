import React, { useMemo, useState } from 'react'

const COMMISSION_RATE = 0.30 // 30%

const seedItems = [
  {
    id: "1",
    title: "Timber Bookshelf (1.8m)",
    description: "Solid timber shelf from a cleanout. Wiped and inspected. Scuffs consistent with age.",
    price: 80,
    category: "Furniture",
    condition: "Good",
    location: "Parramatta, NSW",
    pickup: true,
    photos: ["https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop"],
    verifiedSource: "NDIS Cleanout",
  },
  {
    id: "2",
    title: "Samsung 40\" TV (2017)",
    description: "Power tested. HDMI works. Remote included.",
    price: 120,
    category: "Electronics",
    condition: "Fair",
    location: "Ryde, NSW",
    pickup: true,
    photos: ["https://images.unsplash.com/photo-1593359677879-641f2be0d93e?q=80&w=1200&auto=format&fit=crop"],
    verifiedSource: "NDIS Cleanout",
  },
  {
    id: "3",
    title: "Dining Table (4-seater)",
    description: "Laminate top, sturdy. Minor wear on edges.",
    price: 90,
    category: "Furniture",
    condition: "Good",
    location: "Blacktown, NSW",
    pickup: true,
    photos: ["https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop"],
    verifiedSource: "NDIS Cleanout",
  },
  {
    id: "4",
    title: "Assorted Novels Bundle (x20)",
    description: "Mixed authors. Cleaned and sorted.",
    price: 30,
    category: "Books & Media",
    condition: "Good",
    location: "Auburn, NSW",
    pickup: false,
    deliveryFee: 12,
    photos: ["https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop"],
    verifiedSource: "NDIS Cleanout",
  },
]

const currency = (n) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })

export default function App(){
  const [items, setItems] = useState(seedItems)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [cart, setCart] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newItem, setNewItem] = useState({ category:'Furniture', condition:'Good', pickup:true, photos:[], verifiedSource:'NDIS Cleanout' })

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesQuery = (i.title + ' ' + i.description + ' ' + i.location).toLowerCase().includes(query.toLowerCase())
      const matchesCat = category ? i.category === category : true
      const matchesCond = condition ? i.condition === condition : true
      return matchesQuery && matchesCat && matchesCond
    })
  }, [items, query, category, condition])

  const cartItems = cart.map(id => items.find(i => i.id === id)).filter(Boolean)
  const subtotal = cartItems.reduce((s, i) => s + i.price + (i.deliveryFee ?? 0), 0)
  const commission = subtotal * COMMISSION_RATE
  const total = subtotal + commission

  function addToCart(id){
    setCart(c => c.includes(id) ? c : [...c, id])
  }
  function removeFromCart(id){
    setCart(c => c.filter(x => x !== id))
  }

  function createListing(e){
    e.preventDefault()
    if(!newItem.title || !newItem.price || !newItem.description || !newItem.location) return alert('Fill all required fields')
    const id = Math.random().toString(36).slice(2)
    const photos = newItem.photos?.length ? newItem.photos : ["https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop"]
    const item = {
      id,
      title: newItem.title,
      description: newItem.description,
      price: Number(newItem.price),
      category: newItem.category,
      condition: newItem.condition,
      location: newItem.location,
      pickup: !!newItem.pickup,
      deliveryFee: newItem.deliveryFee ? Number(newItem.deliveryFee) : undefined,
      photos,
      verifiedSource: newItem.verifiedSource,
    }
    setItems(arr => [item, ...arr])
    setNewItem({ category:'Furniture', condition:'Good', pickup:true, photos:[], verifiedSource:'NDIS Cleanout' })
    setShowNew(false)
  }

  function mailtoOrder(){
    // Build an email draft the user can send manually (no paid service).
    const lines = [
      'Hi Cleanout Market team,',
      '',
      'I would like to purchase:',
      ...cartItems.map(i => `- ${i.title} (${currency(i.price)}${i.deliveryFee ? ` + ${currency(i.deliveryFee)} delivery` : ''})`),
      '',
      `Subtotal: ${currency(subtotal)}`,
      `Commission (10%): ${currency(commission)}`,
      `Total: ${currency(total)}`,
      '',
      'My name:',
      'My phone:',
      'Preferred pickup/delivery window:',
      '',
      'Thanks!'
    ]
    const body = encodeURIComponent(lines.join('\n'))
    const to = 'hello@cleanout.market'
    const subject = encodeURIComponent('Purchase Request - Cleanout Market')
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  return (
    <div>
      <header>
        <div className="container toolbar">
          <span style={{display:'flex',alignItems:'center',gap:8}}>
            <span>🚚</span>
            <h1>Cleanout Market</h1>
            <span className="badge">NDIS‑aligned</span>
          </span>

          <div className="search">
            <span className="icon">🔎</span>
            <input placeholder="Search listings, suburbs…" value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">Category</option>
            <option>Furniture</option>
            <option>Electronics</option>
            <option>Books & Media</option>
            <option>Homewares</option>
            <option>Tools</option>
          </select>
          <select value={condition} onChange={e=>setCondition(e.target.value)}>
            <option value="">Condition</option>
            <option>New</option>
            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>For Parts</option>
          </select>
          <button className="btn" onClick={()=>setShowNew(true)}>+ New Listing</button>
          <button className="btn-outline" onClick={mailtoOrder}>Cart ({cart.length})</button>
        </div>
        <div className="container small" style={{paddingTop:0}}>
          <div className="notice">
            How this works: resale of items recovered during consent‑approved cleanouts. Commission funds safer removals. Prohibited items: medical devices/consumables, hazardous goods, perishables, child seats, etc.
          </div>
        </div>
      </header>

      <main className="container" style={{paddingTop:24}}>
        <div className="grid">
          {filtered.map(i => (
            <div className="card" key={i.id}>
              <img src={i.photos[0]} alt={i.title} />
              <div className="content">
                <h3>{i.title} {i.verifiedSource && <span className="pill">✅ {i.verifiedSource}</span>}</h3>
                <p>{i.description}</p>
                <div className="row">
                  <div><strong>{currency(i.price)}</strong></div>
                  <div className="small">{i.condition} • {i.category}</div>
                </div>
                <div className="small">{i.pickup ? 'Pickup only' : `Delivery ${i.deliveryFee ? currency(i.deliveryFee) : 'available'}`} • {i.location}</div>
                <div className="row" style={{marginTop:10, gap:8}}>
                  <button className="btn" style={{flex:1}} onClick={()=>addToCart(i.id)}>Add to cart</button>
                  <button className="btn-outline" style={{flex:1}} onClick={()=>alert('Demo only – add to cart and send purchase email.')}>View</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="small" style={{textAlign:'center', padding:'60px 0'}}>No items match your filters.</div>
        )}

        <div className="footer">
          <div className="grid">
            <div className="stack">
              <strong>About</strong>
              <span className="small">Turning potential waste into community value while supporting safer NDIS‑aligned decluttering services.</span>
            </div>
            <div className="stack">
              <strong>Policies</strong>
              <ul className="small" style={{margin:0, paddingLeft:18}}>
                <li>Consent & Ownership</li>
                <li>Prohibited Items</li>
                <li>Item Hygiene & Testing</li>
                <li>Returns (faults within 7 days)</li>
              </ul>
            </div>
            <div className="stack">
              <strong>Contact</strong>
              <span className="small">hello@cleanout.market<br/>Parramatta NSW</span>
            </div>
          </div>
        </div>
      </main>

      {showNew && (
        <div className="modal-backdrop" onClick={()=>setShowNew(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Add New Listing</h3>
            <form onSubmit={createListing} className="form-grid">
              <div className="span-2">
                <label>Title</label>
                <input value={newItem.title||''} onChange={e=>setNewItem(s=>({...s, title:e.target.value}))} placeholder="e.g., 2‑Seater Sofa" required/>
              </div>
              <div className="span-2">
                <label>Description</label>
                <input value={newItem.description||''} onChange={e=>setNewItem(s=>({...s, description:e.target.value}))} placeholder="Brief condition, notes" required/>
              </div>
              <div>
                <label>Price (AUD)</label>
                <input type="number" step="1" value={newItem.price||''} onChange={e=>setNewItem(s=>({...s, price:e.target.value}))} required/>
              </div>
              <div>
                <label>Delivery Fee (optional)</label>
                <input type="number" step="1" value={newItem.deliveryFee||''} onChange={e=>setNewItem(s=>({...s, deliveryFee:e.target.value}))}/>
              </div>
              <div>
                <label>Category</label>
                <select value={newItem.category} onChange={e=>setNewItem(s=>({...s, category:e.target.value}))}>
                  <option>Furniture</option>
                  <option>Electronics</option>
                  <option>Books & Media</option>
                  <option>Homewares</option>
                  <option>Tools</option>
                </select>
              </div>
              <div>
                <label>Condition</label>
                <select value={newItem.condition} onChange={e=>setNewItem(s=>({...s, condition:e.target.value}))}>
                  <option>New</option>
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>For Parts</option>
                </select>
              </div>
              <div className="span-2">
                <label>Pickup Location</label>
                <input value={newItem.location||''} onChange={e=>setNewItem(s=>({...s, location:e.target.value}))} placeholder="Suburb, State" required/>
              </div>
              <div className="span-2">
                <label>Photo URL (optional)</label>
                <input placeholder="https://..." onBlur={e=>{
                  const val = e.target.value.trim()
                  if(val) setNewItem(s=>({...s, photos:[...(s.photos||[]), val]}))
                  e.target.value = ''
                }}/>
                <div className="small" style={{marginTop:6}}>
                  Tip: paste an image URL from your phone/computer or use defaults.
                </div>
              </div>
              <div className="span-2" style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button type="button" className="btn-outline" onClick={()=>setShowNew(false)}>Cancel</button>
                <button className="btn" type="submit">Create Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
