import React, { useEffect, useMemo, useState } from 'react'

/** ====== PLATFORM SETTINGS ====== */
const COMMISSION_RATE = 0.30 // 30% platform commission on fixed-price sales

/** ====== TYPES (in plain JS via comments) ======
Item: {
  id: string,
  title: string,
  description: string,
  price?: number,           // used for fixed-price sale
  category: string,
  condition: 'New'|'Excellent'|'Good'|'Fair'|'For Parts',
  location: string,
  pickup: boolean,
  deliveryFee?: number,
  photos: string[],
  verifiedSource?: string,
  // sale type fields:
  saleType: 'sale' | 'auction',
  reservePrice?: number,    // auction minimum (must be met)
  endTime?: string,         // ISO string for auction ending
  currentBid?: number,      // highest bid so far
  highestBidder?: string,   // email of highest bidder (demo only)
  bids?: Array<{amount:number,email:string,time:string}>
}
=================================== */

const seedItems = [
  // Fixed-price example
  {
    id: '1',
    title: 'Timber Bookshelf (1.8m)',
    description: 'Solid timber shelf from a cleanout. Wiped and inspected. Scuffs consistent with age.',
    price: 80,
    category: 'Furniture',
    condition: 'Good',
    location: 'Parramatta, NSW',
    pickup: true,
    photos: ['https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop'],
    verifiedSource: 'NDIS Cleanout',
    saleType: 'sale',
  },
  // Auction example (ends in ~2 hours from first load)
  {
    id: '2',
    title: 'Samsung 40" TV (2017)',
    description: 'Power tested. HDMI works. Remote included.',
    category: 'Electronics',
    condition: 'Fair',
    location: 'Ryde, NSW',
    pickup: true,
    photos: ['https://images.unsplash.com/photo-1593359677879-641f2be0d93e?q=80&w=1200&auto=format&fit=crop'],
    verifiedSource: 'NDIS Cleanout',
    saleType: 'auction',
    reservePrice: 80,
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2h
    currentBid: 60,
    highestBidder: '',
    bids: [],
  },
  // Another fixed-price
  {
    id: '3',
    title: 'Dining Table (4-seater)',
    description: 'Laminate top, sturdy. Minor wear on edges.',
    price: 90,
    category: 'Furniture',
    condition: 'Good',
    location: 'Blacktown, NSW',
    pickup: true,
    photos: ['https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop'],
    verifiedSource: 'NDIS Cleanout',
    saleType: 'sale',
  },
  // Books example (sale)
  {
    id: '4',
    title: 'Assorted Novels Bundle (x20)',
    description: 'Mixed authors. Cleaned and sorted.',
    price: 30,
    category: 'Books & Media',
    condition: 'Good',
    location: 'Auburn, NSW',
    pickup: false,
    deliveryFee: 12,
    photos: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop'],
    verifiedSource: 'NDIS Cleanout',
    saleType: 'sale',
  },
]

const currency = (n) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })

/** Simple countdown hook for auctions */
function useCountdown(targetISO) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!targetISO) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetISO])
  if (!targetISO) return { msLeft: 0, ended: false, label: '' }
  const msLeft = new Date(targetISO).getTime() - now
  const ended = msLeft <= 0
  const s = Math.max(0, Math.floor(msLeft / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const label = ended ? 'Ended' : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return { msLeft, ended, label }
}

export default function App(){
  const [items, setItems] = useState(seedItems)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [cart, setCart] = useState([])

  // New listing modal
  const [showNew, setShowNew] = useState(false)
  const [newItem, setNewItem] = useState({
  // core
  saleType: 'sale',
  category: 'Furniture',
  condition: 'Good',
  pickup: true,
  photos: [],
  verifiedSource: 'NDIS Cleanout',

  // Hub identity (you already had these)
  allowHub: true,
  hubName: 'Cleanout Hub – Parramatta',
  hubAddress: '12 Example St, Parramatta NSW',
  hubHandlingFee: '',

  // >>> NEW: seller logistics model
  primaryOption: '',               // 'hub-drop' | 'seller-delivery' | 'support-to-hub'
  // 1) Drop at Hub
  hubDropWindowsText: '',          // e.g. "Mon 10–12, Tue 2–4"
  // 2) Seller delivers
  sellerDeliveryWindowsText: '',   // e.g. "Wed 5–7pm, Sat 9–11am"
  // 3) Support worker to Hub (details later)
  supportToHub: false,             // we infer from primaryOption, but keep a flag for clarity

  // 4) Buyer pickup at seller (extra togglable option)
  allowBuyerPickupAtSeller: false,
  buyerPickupWindowsText: '',      // optional if safe place
  buyerPickupSafePlace: false,     // if true, no time required

  // pricing you may still want to keep
  deliveryFee: '',                 // fee used for "seller delivery" if you charge
  hubWindowsText: 'Mon 10–12, Tue 2–4', // keep general hub availability if you show it

  })

  // Bid modal
  const [bidModal, setBidModal] = useState({ open:false, itemId:'', amount:'', email:'' })

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesQuery = (i.title + ' ' + i.description + ' ' + i.location).toLowerCase().includes(query.toLowerCase())
      const matchesCat = category ? i.category === category : true
      const matchesCond = condition ? i.condition === condition : true
      return matchesQuery && matchesCat && matchesCond
    })
  }, [items, query, category, condition])

  const cartItems = cart.map(id => items.find(i => i.id === id)).filter(Boolean)
  const subtotal = cartItems.reduce((s, i) => s + (i.price ?? 0) + (i.deliveryFee ?? 0), 0)
  const commission = subtotal * COMMISSION_RATE
  const total = subtotal + commission

  function addToCart(id){
    const it = items.find(x => x.id === id)
    if (!it) return
    if (it.saleType === 'auction') {
      alert('This is an auction item. Place a bid instead.')
      return
    }
    setCart(c => c.includes(id) ? c : [...c, id])
  }
  function removeFromCart(id){
    setCart(c => c.filter(x => x !== id))
  }

  function createListing(e){
    e.preventDefault()
    if(!newItem.title || !newItem.description || !newItem.location) return alert('Fill all required fields')

    // fixed price requires price
    if (newItem.saleType === 'sale' && !newItem.price) return alert('Enter a price for fixed-price sale')
    // auction requires reserve and end time
    if (newItem.saleType === 'auction' && (!newItem.reservePrice || !newItem.endTime)) {
      return alert('Enter a reserve price and an end time for the auction')
    }

    const id = Math.random().toString(36).slice(2)
    const photos = newItem.photos?.length ? newItem.photos : ["https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop"]
    const item = {
      id,
      title: newItem.title,
      description: newItem.description,
      price: newItem.saleType === 'sale' ? Number(newItem.price) : undefined,
      category: newItem.category,
      condition: newItem.condition,
      location: newItem.location,
      pickup: !!newItem.pickup,
      deliveryFee: newItem.deliveryFee ? Number(newItem.deliveryFee) : undefined,
      photos,
      verifiedSource: newItem.verifiedSource,// NEW logistics + services to save on the item
// PRIMARY (exactly one)
primaryOption: newItem.primaryOption,
optionHubDrop: newItem.primaryOption === 'hub-drop',
hubDropWindows: (newItem.hubDropWindowsText || '')
  .split(',').map(s => s.trim()).filter(Boolean),

optionSellerDelivery: newItem.primaryOption === 'seller-delivery',
sellerDeliveryWindows: (newItem.sellerDeliveryWindowsText || '')
  .split(',').map(s => s.trim()).filter(Boolean),
deliveryFee: newItem.deliveryFee ? Number(newItem.deliveryFee) : undefined,

optionSupportPickupToHub: newItem.primaryOption === 'support-to-hub',

// OPTIONAL: buyer pickup at seller
optionBuyerPickupAtSeller: !!newItem.allowBuyerPickupAtSeller,
buyerPickupWindows: (newItem.buyerPickupWindowsText || '')
  .split(',').map(s => s.trim()).filter(Boolean),
buyerPickupSafePlace: !!newItem.buyerPickupSafePlace,

// Keep hub identity on the item
hubName: newItem.hubName || undefined,
hubAddress: newItem.hubAddress || undefined,
hubHandlingFee: newItem.hubHandlingFee ? Number(newItem.hubHandlingFee) : undefined,

specialistDeliveryFee: newItem.specialistDeliveryFee ? Number(newItem.specialistDeliveryFee) : undefined,

hubWindows: (newItem.hubWindowsText || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean),

      allowPickup: !!newItem.allowPickup,
allowDelivery: !!newItem.allowDelivery,
deliveryFee: newItem.deliveryFee ? Number(newItem.deliveryFee) : undefined,
allowHub: !!newItem.allowHub,
hubName: newItem.hubName || undefined,
hubAddress: newItem.hubAddress || undefined,
hubHandlingFee: newItem.hubHandlingFee ? Number(newItem.hubHandlingFee) : undefined,

      saleType: newItem.saleType,
      reservePrice: newItem.saleType === 'auction' ? Number(newItem.reservePrice) : undefined,
      endTime: newItem.saleType === 'auction' ? newItem.endTime : undefined,
      currentBid: newItem.saleType === 'auction' ? 0 : undefined,
      highestBidder: '',
      bids: newItem.saleType === 'auction' ? [] : undefined,
    }
    setItems(arr => [item, ...arr])
    setNewItem({ saleType:'sale', category:'Furniture', condition:'Good', pickup:true, photos:[], verifiedSource:'NDIS Cleanout' })
    setShowNew(false)
  }

  function mailtoOrder(){
    const lines = [
      'Hi Cleanout Market team,',
      '',
      'I would like to purchase:',
      ...cartItems.map(i => `- ${i.title} (${currency(i.price)}${i.deliveryFee ? ` + ${currency(i.deliveryFee)} delivery` : ''})`),
      '',
      `Subtotal: ${currency(subtotal)}`,
      `Commission (${Math.round(COMMISSION_RATE*100)}%): ${currency(commission)}`,
      `Total: ${currency(total)}`,
      '',
      'My name:',
      'My phone:',
      'Preferred pickup/delivery window:',
      '',
      'Thanks!'
    ]
    const body = encodeURIComponent(lines.join('\n'))
    const to = 'hello@cleanout.market' // <-- change to your email
    const subject = encodeURIComponent('Purchase Request - Cleanout Market')
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  function openBidModal(itemId){
    setBidModal({ open:true, itemId, amount:'', email:'' })
  }
  function placeBid(e){
    e.preventDefault()
    const it = items.find(x => x.id === bidModal.itemId)
    if (!it || it.saleType !== 'auction') return
    const bid = Number(bidModal.amount || 0)
    if (!bidModal.email || !bid || bid <= 0) { alert('Add your email and a valid bid'); return }
    // must be higher than current bid
    const minNext = Math.max(it.currentBid || 0, 0) + 1
    if (bid < minNext) { alert(`Bid must be at least ${currency(minNext)}`); return }
    // must be before auction end
    if (it.endTime && Date.now() > new Date(it.endTime).getTime()) { alert('Auction has ended'); return }

    const updated = items.map(x => {
      if (x.id !== it.id) return x
      const bids = [...(x.bids || []), { amount: bid, email: bidModal.email, time: new Date().toISOString() }]
      return { ...x, currentBid: bid, highestBidder: bidModal.email, bids }
    })
    setItems(updated)
    setBidModal({ open:false, itemId:'', amount:'', email:'' })
  }

  function AuctionBadge({ item }) {
    const { label, ended } = useCountdown(item.endTime)
    const metReserve = (item.currentBid || 0) >= (item.reservePrice || 0)
    const status = ended ? (metReserve ? 'Auction ended – Reserve met' : 'Auction ended – Reserve NOT met') : `Ends in ${label}`
    return (
      <div className="small" style={{marginTop:6}}>
        <strong>Auction</strong> • {status} • Current bid {currency(item.currentBid || 0)} (Reserve {currency(item.reservePrice || 0)})
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header>
        <div className="container" style={{display:'flex', gap:8, alignItems:'center'}}>
          <span style={{display:'flex',alignItems:'center',gap:8}}>
            <img src="/logo.png" alt="Cleanout Market" style={{ width: 40, height: 40, borderRadius: 8 }} />
            <h1>Cleanout Market</h1>
            <span className="badge">NDIS-aligned</span>
          </span>

          <div className="search" style={{marginLeft: 'auto'}}>
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
            How this works: resale of items recovered during consent-approved cleanouts. Auction items are demo-only until we add a database; fixed-price items can be purchased via the Request-to-Buy email.
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="container" style={{paddingTop:24}}>
        <div className="grid">
          {filtered.map(i => {
            const isAuction = i.saleType === 'auction'
            return (
              <div className="card" key={i.id}>
                <img src={i.photos[0]} alt={i.title} />
                <div className="content">
                  <h3>{i.title} {i.verifiedSource && <span className="pill">✅ {i.verifiedSource}</span>}</h3>
                  <p>{i.description}</p>

                  {isAuction ? (
                    <>
                      <div className="row">
                        <div><strong>Current: {currency(i.currentBid || 0)}</strong></div>
                        <div className="small">Reserve: {currency(i.reservePrice || 0)}</div>
                      </div>
                      <AuctionBadge item={i} />
                      <div className="row" style={{marginTop:10, gap:8}}>
                        <button className="btn" style={{flex:1}} onClick={()=>openBidModal(i.id)}>Place bid</button>
                        <button className="btn-outline" style={{flex:1}} onClick={()=>alert('Auction item – bidding only')}>View</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="row">
                        <div><strong>{currency(i.price)}</strong></div>
                        <div className="small">{i.condition} • {i.category}</div>
                      </div>
                      <div className="small">
  {i.allowPickup && 'Pickup'}
  {i.allowPickup && (i.allowDelivery || i.allowHub) ? ' • ' : ''}
  {i.allowDelivery && `Delivery${i.deliveryFee ? ' ' + currency(i.deliveryFee) : ''}`}
  {(i.allowDelivery && i.allowHub) ? ' • ' : ''}
  {i.allowHub && `${i.hubName || 'Hub pickup'}${i.hubHandlingFee ? ' ' + currency(i.hubHandlingFee) : ''}`}
  {' • '}{i.location}
</div>

                      <div className="row" style={{marginTop:10, gap:8}}>
                        <button className="btn" style={{flex:1}} onClick={()=>addToCart(i.id)}>Add to cart</button>
                        <button className="btn-outline" style={{flex:1}} onClick={()=>alert('Demo only – add to cart and send purchase email.')}>View</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="small" style={{textAlign:'center', padding:'60px 0'}}>No items match your filters.</div>
        )}

        {/* Footer */}
        <div className="footer">
          <div className="grid">
            <div className="stack">
              <strong>About</strong>
              <span className="small">Turning potential waste into community value while supporting safer NDIS-aligned decluttering services.</span>
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

      {/* New Listing Modal */}
      {showNew && (
        <div className="modal-backdrop" onClick={()=>setShowNew(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Add New Listing</h3>
            <form onSubmit={createListing} className="form-grid">
              <div>
                <label>Sale Type</label>
                <select value={newItem.saleType} onChange={e=>setNewItem(s=>({...s, saleType:e.target.value}))}>
                  <option value="sale">Sale (fixed price)</option>
                  <option value="auction">Auction (reserve + timer)</option>
                </select>
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

              <div className="span-2">
                <label>Title</label>
                <input value={newItem.title||''} onChange={e=>setNewItem(s=>({...s, title:e.target.value}))} placeholder="e.g., 2-Seater Sofa" required/>
              </div>
              <div className="span-2">
                <label>Description</label>
                <input value={newItem.description||''} onChange={e=>setNewItem(s=>({...s, description:e.target.value}))} placeholder="Brief condition, notes" required/>
              </div>

              {newItem.saleType === 'sale' && (
                <>
                  <div>
                    <label>Price (AUD)</label>
                    <input type="number" step="1" value={newItem.price||''} onChange={e=>setNewItem(s=>({...s, price:e.target.value}))}/>
                  </div>
                  <div>
                    <label>Delivery Fee (optional)</label>
                    <input type="number" step="1" value={newItem.deliveryFee||''} onChange={e=>setNewItem(s=>({...s, deliveryFee:e.target.value}))}/>
                  </div>
                  {/* -------- SELLER LOGISTICS -------- */}
<div className="span-2" style={{borderTop:'1px solid #eee', paddingTop:10, marginTop:10}}>
  <strong>How will this item be handled?</strong>
  <div className="small">Choose ONE primary option (1–3). You may also enable buyer pickup (4).</div>
</div>

{/* 1) Drop at Hub */}
<div>
  <label>
    <input type="radio" name="primaryOption"
      checked={newItem.primaryOption === 'hub-drop'}
      onChange={()=>setNewItem(s=>({...s, primaryOption:'hub-drop'}))}
    /> 1) I will drop the item at the Cleanout Hub
  </label>
  {newItem.primaryOption === 'hub-drop' && (
    <div className="small" style={{marginTop:6}}>
      <div><b>Drop-off time(s)</b> (comma separated):</div>
      <input
        value={newItem.hubDropWindowsText||''}
        onChange={e=>setNewItem(s=>({...s, hubDropWindowsText:e.target.value}))}
        placeholder="Mon 10–12, Tue 2–4"
      />
    </div>
  )}
</div>

{/* 2) Seller delivers to buyer */}
<div style={{marginTop:8}}>
  <label>
    <input type="radio" name="primaryOption"
      checked={newItem.primaryOption === 'seller-delivery'}
      onChange={()=>setNewItem(s=>({...s, primaryOption:'seller-delivery'}))}
    /> 2) I can deliver it to the buyer
  </label>
  {newItem.primaryOption === 'seller-delivery' && (
    <div className="small" style={{marginTop:6}}>
      <div><b>Delivery window(s)</b> (comma separated):</div>
      <input
        value={newItem.sellerDeliveryWindowsText||''}
        onChange={e=>setNewItem(s=>({...s, sellerDeliveryWindowsText:e.target.value}))}
        placeholder="Wed 5–7pm, Sat 9–11am"
      />
      <div style={{marginTop:6}}>
        <label>Delivery fee (optional)</label>
        <input type="number" step="1"
          value={newItem.deliveryFee||''}
          onChange={e=>setNewItem(s=>({...s, deliveryFee:e.target.value}))}
        />
      </div>
    </div>
  )}
</div>

{/* 3) Support worker → Hub (details later) */}
<div style={{marginTop:8}}>
  <label>
    <input type="radio" name="primaryOption"
      checked={newItem.primaryOption === 'support-to-hub'}
      onChange={()=>setNewItem(s=>({...s, primaryOption:'support-to-hub', supportToHub:true}))}
    /> 3) A support worker will pick up and take it to the Hub
  </label>
  {newItem.primaryOption === 'support-to-hub' && (
    <div className="small" style={{marginTop:6}}>
      (We’ll contact you to arrange pickup.)
    </div>
  )}
</div>

{/* 4) Optional: buyer pickup at seller */}
<div className="span-2" style={{borderTop:'1px solid #eee', paddingTop:10, marginTop:10}}>
  <strong>Optional: also allow buyer pickup (4)</strong>
</div>
<div>
  <label>
    <input type="checkbox"
      checked={!!newItem.allowBuyerPickupAtSeller}
      onChange={e=>setNewItem(s=>({...s, allowBuyerPickupAtSeller:e.target.checked}))}
    /> 4) Buyer can pick up from me
  </label>

  {newItem.allowBuyerPickupAtSeller && (
    <>
      <div className="small" style={{marginTop:6}}>
        <label>Pickup window(s) (comma separated)</label>
        <input
          value={newItem.buyerPickupWindowsText||''}
          onChange={e=>setNewItem(s=>({...s, buyerPickupWindowsText:e.target.value}))}
          placeholder="Thu 3–5pm, Sun 9–11am"
        />
      </div>
      <div className="small" style={{marginTop:6}}>
        <label>
          <input type="checkbox"
            checked={!!newItem.buyerPickupSafePlace}
            onChange={e=>setNewItem(s=>({...s, buyerPickupSafePlace:e.target.checked}))}
          /> I will leave in a safe place (pickup any time)
        </label>
      </div>
    </>
  )}
</div>

                  {/* Specialist services */}
<div className="span-2" style={{borderTop:'1px solid #eee', paddingTop:10, marginTop:4}}>
  <strong>Specialist Services (your team)</strong>
</div>

<div>
  <label>
    <input type="checkbox"
      checked={!!newItem.allowSpecialistPickupToHub}
      onChange={e=>setNewItem(s=>({...s, allowSpecialistPickupToHub:e.target.checked}))}/>
    {' '}Pickup from seller to Hub
  </label>
</div>
<div>
  <label>Specialist Pickup Fee (optional)</label>
  <input type="number" step="1" value={newItem.specialistPickupFee||''}
    onChange={e=>setNewItem(s=>({...s, specialistPickupFee:e.target.value}))}/>
</div>

<div>
  <label>
    <input type="checkbox"
      checked={!!newItem.allowSpecialistDeliveryFromHub}
      onChange={e=>setNewItem(s=>({...s, allowSpecialistDeliveryFromHub:e.target.checked}))}/>
    {' '}Delivery from Hub to buyer
  </label>
</div>
<div>
  <label>Specialist Delivery Fee (optional)</label>
  <input type="number" step="1" value={newItem.specialistDeliveryFee||''}
    onChange={e=>setNewItem(s=>({...s, specialistDeliveryFee:e.target.value}))}/>
</div>

<div className="span-2">
  <label>Hub Time Windows (comma separated)</label>
  <input value={newItem.hubWindowsText||''}
    onChange={e=>setNewItem(s=>({...s, hubWindowsText:e.target.value}))}
    placeholder="Mon 10–12, Tue 2–4"/>
</div>
                  
                  
                  
                </>
              )}

              {newItem.saleType === 'auction' && (
                <>
                  <div>
                    <label>Reserve Price (AUD)</label>
                    <input type="number" step="1" value={newItem.reservePrice||''} onChange={e=>setNewItem(s=>({...s, reservePrice:e.target.value}))}/>
                  </div>
                  <div>
                    <label>Auction End Time</label>
                    <input type="datetime-local" value={newItem.endTime||''} onChange={e=>setNewItem(s=>({...s, endTime:e.target.value}))}/>
                  </div>
                </>
              )}

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
              <div>
                <label>Pickup?</label>
                <select value={newItem.pickup ? 'yes' : 'no'} onChange={e=>setNewItem(s=>({...s, pickup:e.target.value==='yes'}))}>
                  <option value="yes">Yes - pickup only</option>
                  <option value="no">No - delivery possible</option>
                </select>
              </div>

              <div className="span-2">
                <label>Pickup Location</label>
                <input value={newItem.location||''} onChange={e=>setNewItem(s=>({...s, location:e.target.value}))} placeholder="Suburb, State" required/>
              </div>
{/* LOGISTICS OPTIONS */}
<div className="span-2" style={{borderTop:'1px solid #eee', paddingTop:10, marginTop:4}}>
  <strong>Logistics</strong>
</div>

<div>
  <label>
    <input type="checkbox"
      checked={!!newItem.allowPickup}
      onChange={e=>setNewItem(s=>({...s, allowPickup:e.target.checked}))} />
    {' '}Pickup at seller
  </label>
</div>

<div>
  <label>
    <input type="checkbox"
      checked={!!newItem.allowDelivery}
      onChange={e=>setNewItem(s=>({...s, allowDelivery:e.target.checked}))} />
    {' '}Delivery
  </label>
</div>

<div>
  <label>Delivery Fee (optional)</label>
  <input type="number" step="1" value={newItem.deliveryFee||''}
    onChange={e=>setNewItem(s=>({...s, deliveryFee:e.target.value}))}/>
</div>

<div>
  <label>
    <input type="checkbox"
      checked={!!newItem.allowHub}
      onChange={e=>setNewItem(s=>({...s, allowHub:e.target.checked}))} />
    {' '}Home Base (Hub) pickup
  </label>
</div>

<div>
  <label>Hub Name</label>
  <input value={newItem.hubName||''}
    onChange={e=>setNewItem(s=>({...s, hubName:e.target.value}))}
    placeholder="Cleanout Hub – Parramatta"/>
</div>

<div className="span-2">
  <label>Hub Address</label>
  <input value={newItem.hubAddress||''}
    onChange={e=>setNewItem(s=>({...s, hubAddress:e.target.value}))}
    placeholder="12 Example St, Parramatta NSW"/>
</div>

<div>
  <label>Hub Handling Fee (optional)</label>
  <input type="number" step="1" value={newItem.hubHandlingFee||''}
    onChange={e=>setNewItem(s=>({...s, hubHandlingFee:e.target.value}))}/>
</div>

              <div className="span-2">
                <label>Photo URL (optional)</label>
                <input placeholder="https://..." onBlur={e=>{
                  const val = e.target.value.trim()
                  if(val) setNewItem(s=>({...s, photos:[...(s.photos||[]), val]}))
                  e.target.value = ''
                }}/>
                <div className="small" style={{marginTop:6}}>
                  Tip: paste an image URL or leave blank to use a default.
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

      {/* Bid Modal */}
      {bidModal.open && (
        <div className="modal-backdrop" onClick={()=>setBidModal({open:false,itemId:'',amount:'',email:''})}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Place a Bid</h3>
            <form className="form-grid" onSubmit={placeBid}>
              <div className="span-2">
                <label>Your Email</label>
                <input type="email" required value={bidModal.email} onChange={e=>setBidModal(s=>({...s, email:e.target.value}))} placeholder="you@example.com"/>
              </div>
              <div className="span-2">
                <label>Bid Amount (AUD)</label>
                <input type="number" required step="1" value={bidModal.amount} onChange={e=>setBidModal(s=>({...s, amount:e.target.value}))}/>
              </div>
              <div className="span-2" style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button type="button" className="btn-outline" onClick={()=>setBidModal({open:false,itemId:'',amount:'',email:''})}>Cancel</button>
                <button className="btn" type="submit">Submit Bid</button>
              </div>
              <div className="span-2 small notice">
                Demo note: bids are stored in your browser only. For real auctions (email receipts, anti-sniping extensions, auto-winner emails) we’ll add a free database next.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
