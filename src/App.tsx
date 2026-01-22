import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, MapPin, Plus, Trash2, Edit, RefreshCw, ClipboardList, ShoppingCart, Map, Menu, X, UserCheck, Download, Route } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const NICARAGUA_CENTER: [number, number] = [12.1364, -86.2514]
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoicGVyY3lzY2FzdGlsbG8iLCJhIjoiY2wxcGFyYWttMDhkOTNjb2Q5anJkY3B2dyJ9.aAXVPRNQ4e2ifF20zjQbsQ'

interface Vendedor {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  latitud: number | null
  longitud: number | null
  estado: string
  ultima_actualizacion: string | null
  fecha_creacion: string
}

interface VisitaConNombre {
  id: number
  vendedor_id: number
  nombre_cliente: string
  direccion: string | null
  notas: string | null
  tipo_visita: string
  estado: string
  fecha_creacion: string
  fecha_completado: string | null
  nombre_vendedor?: string
}

interface PedidoConNombre {
  id: number
  vendedor_id: number
  nombre_cliente: string
  productos: string | null
  monto_total: number
  estado: string
  fecha_creacion: string
  nombre_vendedor?: string
}

interface Cliente {
  id: number
  vendedor_id: number
  nombre: string
  direccion: string | null
  telefono: string | null
  latitud: number
  longitud: number
  notas: string | null
  fecha_creacion: string
  nombre_vendedor?: string
  tipo_animal?: string | null
  cantidad_animales?: number | null
  administracion?: string | null
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const activeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const inactiveIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const clienteIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultIcon

function MapUpdater({ vendedores }: { vendedores: Vendedor[] }) {
  const map = useMap()
  const hasFittedBounds = useRef(false)
  
  useEffect(() => {
    // Solo ajustar el zoom la primera vez que hay vendedores con ubicacion
    if (hasFittedBounds.current) return
    
    const withLocation = vendedores.filter(p => p.latitud && p.longitud)
    if (withLocation.length > 0) {
      const bounds = L.latLngBounds(withLocation.map(p => [p.latitud!, p.longitud!]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      hasFittedBounds.current = true
    }
  }, [vendedores, map])
  
  return null
}

function App() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [visitas, setVisitas] = useState<VisitaConNombre[]>([])
  const [pedidos, setPedidos] = useState<PedidoConNombre[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('map')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
    const [isClienteDetailDialogOpen, setIsClienteDetailDialogOpen] = useState(false)
    const [isSelectVendedorLocationDialogOpen, setIsSelectVendedorLocationDialogOpen] = useState(false)
    const [selectedVendedorForLocation, setSelectedVendedorForLocation] = useState<string>('')
  
    const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    latitud: '',
    longitud: '',
    estado: 'activo'
  })
  
  const [visitForm, setVisitForm] = useState({
    vendedor_id: '',
    nombre_cliente: '',
    direccion: '',
    notas: '',
    tipo_visita: 'visita'
  })
  
  const [orderForm, setOrderForm] = useState({
    vendedor_id: '',
    nombre_cliente: '',
    productos: '',
    monto_total: ''
  })

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      setVendedores(data || [])
    } catch (error) {
      console.error('Error fetching vendedores:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchVisitas = async () => {
    try {
      const { data, error } = await supabase
        .from('visitas')
        .select('*, vendedores(nombre)')
        .order('fecha_creacion', { ascending: false })
      
      if (error) throw error
      const visitasConNombre = (data || []).map((v: any) => ({
        ...v,
        nombre_vendedor: v.vendedores?.nombre || 'Desconocido'
      }))
      setVisitas(visitasConNombre)
    } catch (error) {
      console.error('Error fetching visitas:', error)
    }
  }
  
  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, vendedores(nombre)')
        .order('fecha_creacion', { ascending: false })
      
      if (error) throw error
      const pedidosConNombre = (data || []).map((p: any) => ({
        ...p,
        nombre_vendedor: p.vendedores?.nombre || 'Desconocido'
      }))
      setPedidos(pedidosConNombre)
    } catch (error) {
      console.error('Error fetching pedidos:', error)
    }
  }
  
  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*, vendedores(nombre)')
        .order('fecha_creacion', { ascending: false })
      
      if (error) throw error
      const clientesConNombre = (data || []).map((c: any) => ({
        ...c,
        nombre_vendedor: c.vendedores?.nombre || 'Desconocido'
      }))
      setClientes(clientesConNombre)
    } catch (error) {
      console.error('Error fetching clientes:', error)
    }
  }

  useEffect(() => {
    fetchVendedores()
    fetchVisitas()
    fetchPedidos()
    fetchClientes()
    
    const vendedoresChannel = supabase
      .channel('vendedores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores' }, () => {
        fetchVendedores()
      })
      .subscribe()
    
    const ubicacionesChannel = supabase
      .channel('ubicaciones-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ubicaciones' }, async (payload) => {
        const ubicacion = payload.new as any
        await supabase
          .from('vendedores')
          .update({ 
            latitud: ubicacion.latitud, 
            longitud: ubicacion.longitud,
            ultima_actualizacion: new Date().toISOString()
          })
          .eq('id', ubicacion.vendedor_id)
        fetchVendedores()
      })
      .subscribe()
    
    const interval = setInterval(() => {
      fetchVendedores()
      fetchVisitas()
      fetchPedidos()
      fetchClientes()
    }, 5000)
    
    return () => {
      clearInterval(interval)
      supabase.removeChannel(vendedoresChannel)
      supabase.removeChannel(ubicacionesChannel)
    }
  }, [])

  const handleAddVendedor = async () => {
    try {
      const { error } = await supabase
        .from('vendedores')
        .insert({
          nombre: formData.nombre,
          telefono: formData.telefono || null,
          correo: formData.correo || null,
          latitud: formData.latitud ? parseFloat(formData.latitud) : null,
          longitud: formData.longitud ? parseFloat(formData.longitud) : null,
          estado: formData.estado,
          ultima_actualizacion: new Date().toISOString()
        })
      
      if (error) throw error
      fetchVendedores()
      setIsAddDialogOpen(false)
      setFormData({ nombre: '', telefono: '', correo: '', latitud: '', longitud: '', estado: 'activo' })
    } catch (error) {
      console.error('Error adding vendedor:', error)
    }
  }

  const handleUpdateVendedor = async () => {
    if (!selectedVendedor) return
    try {
      const { error } = await supabase
        .from('vendedores')
        .update({
          nombre: formData.nombre || null,
          telefono: formData.telefono || null,
          correo: formData.correo || null,
          estado: formData.estado
        })
        .eq('id', selectedVendedor.id)
      
      if (error) throw error
      fetchVendedores()
      setIsEditDialogOpen(false)
      setSelectedVendedor(null)
    } catch (error) {
      console.error('Error updating vendedor:', error)
    }
  }

  const handleUpdateLocation = async () => {
    if (!selectedVendedor) return
    try {
      const { error } = await supabase
        .from('vendedores')
        .update({
          latitud: parseFloat(formData.latitud),
          longitud: parseFloat(formData.longitud),
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', selectedVendedor.id)
      
      if (error) throw error
      fetchVendedores()
      setIsLocationDialogOpen(false)
      setSelectedVendedor(null)
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  const handleDeleteVendedor = async (id: number) => {
    if (!confirm('Esta seguro de eliminar este vendedor?')) return
    try {
      const { error } = await supabase
        .from('vendedores')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchVendedores()
    } catch (error) {
      console.error('Error deleting vendedor:', error)
    }
  }
  
  const handleAddVisit = async () => {
    try {
      const { error } = await supabase
        .from('visitas')
        .insert({
          vendedor_id: parseInt(visitForm.vendedor_id),
          nombre_cliente: visitForm.nombre_cliente,
          direccion: visitForm.direccion || null,
          notas: visitForm.notas || null,
          tipo_visita: visitForm.tipo_visita,
          estado: 'pendiente'
        })
      
      if (error) throw error
      fetchVisitas()
      setIsVisitDialogOpen(false)
      setVisitForm({ vendedor_id: '', nombre_cliente: '', direccion: '', notas: '', tipo_visita: 'visita' })
    } catch (error) {
      console.error('Error adding visit:', error)
    }
  }
  
  const handleUpdateVisitStatus = async (id: number, estado: string) => {
    try {
      const updateData: any = { estado }
      if (estado === 'completada') {
        updateData.fecha_completado = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('visitas')
        .update(updateData)
        .eq('id', id)
      
      if (error) throw error
      fetchVisitas()
    } catch (error) {
      console.error('Error updating visit:', error)
    }
  }
  
  const handleDeleteVisit = async (id: number) => {
    if (!confirm('Esta seguro de eliminar esta visita?')) return
    try {
      const { error } = await supabase
        .from('visitas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchVisitas()
    } catch (error) {
      console.error('Error deleting visit:', error)
    }
  }
  
  const handleAddOrder = async () => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .insert({
          vendedor_id: parseInt(orderForm.vendedor_id),
          nombre_cliente: orderForm.nombre_cliente,
          productos: orderForm.productos || null,
          monto_total: orderForm.monto_total ? parseFloat(orderForm.monto_total) : 0,
          estado: 'pendiente'
        })
      
      if (error) throw error
      fetchPedidos()
      setIsOrderDialogOpen(false)
      setOrderForm({ vendedor_id: '', nombre_cliente: '', productos: '', monto_total: '' })
    } catch (error) {
      console.error('Error adding order:', error)
    }
  }
  
  const handleUpdateOrderStatus = async (id: number, estado: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado })
        .eq('id', id)
      
      if (error) throw error
      fetchPedidos()
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }
  
  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Esta seguro de eliminar este pedido?')) return
    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchPedidos()
    } catch (error) {
      console.error('Error deleting order:', error)
    }
  }
  
  const handleDeleteCliente = async (id: number) => {
    if (!confirm('Esta seguro de eliminar este cliente?')) return
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchClientes()
    } catch (error) {
      console.error('Error deleting cliente:', error)
    }
  }
  
  const exportClientesToExcel = () => {
    if (clientes.length === 0) {
      alert('No hay clientes para exportar')
      return
    }
    
    const dataToExport = clientes.map(c => ({
      'Nombre': c.nombre,
      'Direccion': c.direccion || '',
      'Telefono': c.telefono || '',
      'Latitud': c.latitud,
      'Longitud': c.longitud,
      'Notas': c.notas || '',
      'Registrado Por': c.nombre_vendedor || '',
      'Fecha Registro': new Date(c.fecha_creacion).toLocaleString()
    }))
    
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 25 }, // Nombre
      { wch: 40 }, // Direccion
      { wch: 15 }, // Telefono
      { wch: 12 }, // Latitud
      { wch: 12 }, // Longitud
      { wch: 30 }, // Notas
      { wch: 20 }, // Registrado Por
      { wch: 20 }, // Fecha Registro
    ]
    
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }
  
  const openOptimizedRoute = () => {
    if (clientes.length === 0) {
      alert('No hay clientes para crear ruta')
      return
    }
    
    // Crear URL de Google Maps con multiples destinos
    // Google Maps permite hasta 10 waypoints en la URL gratuita
    const waypoints = clientes.slice(0, 10).map(c => `${c.latitud},${c.longitud}`).join('/')
    
    // URL formato: origin/waypoint1/waypoint2/.../destination
    const url = `https://www.google.com/maps/dir/${NICARAGUA_CENTER[0]},${NICARAGUA_CENTER[1]}/${waypoints}`
    
    window.open(url, '_blank')
  }

  const openEditDialog = (vendedor: Vendedor) => {
    setSelectedVendedor(vendedor)
    setFormData({
      nombre: vendedor.nombre,
      telefono: vendedor.telefono || '',
      correo: vendedor.correo || '',
      latitud: '',
      longitud: '',
      estado: vendedor.estado
    })
    setIsEditDialogOpen(true)
  }

    const openLocationDialog = (vendedor: Vendedor) => {
      setSelectedVendedor(vendedor)
      setFormData({
        nombre: '',
        telefono: '',
        correo: '',
        latitud: vendedor.latitud?.toString() || '',
        longitud: vendedor.longitud?.toString() || '',
        estado: ''
      })
      setIsLocationDialogOpen(true)
    }

    const handleRequestLocationWithVendor = () => {
      if (!selectedVendedorForLocation) return
    
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            try {
              const { error } = await supabase
                .from('vendedores')
                .update({
                  latitud: latitude,
                  longitud: longitude,
                  ultima_actualizacion: new Date().toISOString()
                })
                .eq('id', parseInt(selectedVendedorForLocation))
            
              if (error) throw error
              fetchVendedores()
              setIsSelectVendedorLocationDialogOpen(false)
              setSelectedVendedorForLocation('')
              alert('Ubicacion registrada exitosamente')
            } catch (error) {
              console.error('Error updating location:', error)
              alert('Error al registrar la ubicacion')
            }
          },
          (error) => {
            console.error('Error getting location:', error)
            alert('No se pudo obtener la ubicacion. Por favor, verifique los permisos de ubicacion.')
          },
          { enableHighAccuracy: true }
        )
      } else {
        alert('La geolocalizacion no esta soportada en este navegador.')
      }
    }

    const vendedoresConUbicacion = vendedores.filter(p => p.latitud && p.longitud)
  const vendedoresActivos = vendedores.filter(p => p.estado === 'activo')
  const totalVentas = pedidos.reduce((sum, o) => sum + (o.monto_total || 0), 0)

  const menuItems = [
    { id: 'map', label: 'Mapa', icon: Map },
    { id: 'vendedores', label: 'Vendedores', icon: Users },
    { id: 'visitas', label: 'Visitas', icon: ClipboardList },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
    { id: 'clientes', label: 'Clientes', icon: UserCheck },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
      <aside style={{ 
        width: sidebarOpen ? '256px' : '0px', 
        backgroundColor: '#1a1a2e', 
        color: 'white', 
        transition: 'width 0.3s',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', width: '256px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #333' }}>
            <div style={{ backgroundColor: '#10b981', padding: '8px', borderRadius: '8px' }}>
              <MapPin style={{ height: '24px', width: '24px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontWeight: 'bold', fontSize: '18px', color: 'white', margin: 0 }}>Panel Vendedores</h1>
              <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Nicaragua - Supabase</p>
            </div>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeSection === item.id ? '#10b981' : 'transparent',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== item.id) {
                    e.currentTarget.style.backgroundColor = '#2d2d44'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== item.id) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <item.icon style={{ height: '20px', width: '20px' }} />
                <span>{item.label}</span>
              </button>
            ))}
                    </nav>
          
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={() => setIsSelectVendedorLocationDialogOpen(true)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px dashed #10b981',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          color: '#10b981',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <MapPin style={{ height: '20px', width: '20px' }} />
                        <span>Registrar Ubicacion</span>
                      </button>
                    </div>
          
                    <div style={{ marginTop: 'auto', padding: '16px', backgroundColor: '#16213e', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '12px', color: 'white', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estadisticas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af' }}>Vendedores:</span>
                <span style={{ fontWeight: 'bold', color: 'white', backgroundColor: '#2d2d44', padding: '4px 8px', borderRadius: '4px' }}>{vendedores.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af' }}>Activos:</span>
                <span style={{ fontWeight: 'bold', color: '#10b981', backgroundColor: '#2d2d44', padding: '4px 8px', borderRadius: '4px' }}>{vendedoresActivos.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af' }}>Visitas:</span>
                <span style={{ fontWeight: 'bold', color: 'white', backgroundColor: '#2d2d44', padding: '4px 8px', borderRadius: '4px' }}>{visitas.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af' }}>Ventas:</span>
                <span style={{ fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#2d2d44', padding: '4px 8px', borderRadius: '4px' }}>C${totalVentas.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
            >
              {sidebarOpen ? <X style={{ height: '20px', width: '20px', color: '#4b5563' }} /> : <Menu style={{ height: '20px', width: '20px', color: '#4b5563' }} />}
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: 0 }}>
              {menuItems.find(m => m.id === activeSection)?.label}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchVendedores(); fetchVisitas(); fetchPedidos(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </header>

        <main style={{ flex: 1, overflow: 'auto' }}>
          {activeSection === 'map' && (
            <div style={{ height: '100%', width: '100%' }}>
              <MapContainer center={NICARAGUA_CENTER} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                  url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
                />
                <MapUpdater vendedores={vendedoresConUbicacion} />
                {vendedoresConUbicacion.map(vendedor => (
                  <Marker 
                    key={`${vendedor.id}-${vendedor.latitud}-${vendedor.longitud}`} 
                    position={[vendedor.latitud!, vendedor.longitud!]}
                    icon={vendedor.estado === 'activo' ? activeIcon : inactiveIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">{vendedor.nombre}</h3>
                        {vendedor.telefono && <p className="text-sm">Tel: {vendedor.telefono}</p>}
                        {vendedor.correo && <p className="text-sm">Correo: {vendedor.correo}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          Actualizado: {vendedor.ultima_actualizacion ? new Date(vendedor.ultima_actualizacion).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {clientes.map(cliente => (
                  <Marker 
                    key={`cliente-${cliente.id}`} 
                    position={[cliente.latitud, cliente.longitud]}
                    icon={clienteIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-blue-600">{cliente.nombre}</h3>
                        <p className="text-xs text-blue-500 font-semibold">Cliente</p>
                        {cliente.direccion && <p className="text-sm">{cliente.direccion}</p>}
                        {cliente.telefono && <p className="text-sm">Tel: {cliente.telefono}</p>}
                        {cliente.notas && <p className="text-sm text-gray-500 italic">{cliente.notas}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          Registrado por: {cliente.nombre_vendedor}
                        </p>
                        <p className="text-xs text-gray-400">
                          Fecha: {new Date(cliente.fecha_creacion).toLocaleString()}
                        </p>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${Number(cliente.latitud).toFixed(6)}%2C${Number(cliente.longitud).toFixed(6)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ backgroundColor: '#38bdf8', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', display: 'inline-block', marginTop: '8px', textDecoration: 'none' }}
                        >
                          Ver en Google Maps
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
          
          {activeSection === 'vendedores' && (
            <div className="p-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Lista de Vendedores</CardTitle>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Vendedor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Agregar Nuevo Vendedor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nombre">Nombre *</Label>
                          <Input id="nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="telefono">Telefono</Label>
                          <Input id="telefono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="correo">Correo</Label>
                          <Input id="correo" type="email" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="latitud">Latitud</Label>
                            <Input id="latitud" type="number" step="any" value={formData.latitud} onChange={e => setFormData({...formData, latitud: e.target.value})} />
                          </div>
                          <div>
                            <Label htmlFor="longitud">Longitud</Label>
                            <Input id="longitud" type="number" step="any" value={formData.longitud} onChange={e => setFormData({...formData, longitud: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <Label>Estado</Label>
                          <Select value={formData.estado} onValueChange={v => setFormData({...formData, estado: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="inactivo">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={handleAddVendedor} disabled={!formData.nombre}>
                          Guardar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center text-gray-500">Cargando...</p>
                  ) : vendedores.length === 0 ? (
                    <p className="text-center text-gray-500">No hay vendedores registrados</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {vendedores.map(vendedor => (
                        <div key={vendedor.id} className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-lg">{vendedor.nombre}</span>
                            <Badge variant={vendedor.estado === 'activo' ? 'default' : 'secondary'}>
                              {vendedor.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          {vendedor.telefono && <p className="text-sm text-gray-600">Tel: {vendedor.telefono}</p>}
                          {vendedor.correo && <p className="text-sm text-gray-600">Correo: {vendedor.correo}</p>}
                          {vendedor.latitud && vendedor.longitud && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ubicacion: {vendedor.latitud.toFixed(4)}, {vendedor.longitud.toFixed(4)}
                            </p>
                          )}
                          {vendedor.ultima_actualizacion && (
                            <p className="text-xs text-gray-400 mt-1">
                              Actualizado: {new Date(vendedor.ultima_actualizacion).toLocaleString()}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(vendedor)}>
                              <Edit className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openLocationDialog(vendedor)}>
                              <MapPin className="h-3 w-3 mr-1" /> Ubicacion
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteVendedor(vendedor.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeSection === 'visitas' && (
            <div className="p-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Visitas</CardTitle>
                  <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Visita
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Nueva Visita</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Vendedor *</Label>
                          <Select value={visitForm.vendedor_id} onValueChange={v => setVisitForm({...visitForm, vendedor_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar vendedor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendedores.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="cliente">Cliente *</Label>
                          <Input id="cliente" value={visitForm.nombre_cliente} onChange={e => setVisitForm({...visitForm, nombre_cliente: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="direccion">Direccion</Label>
                          <Input id="direccion" value={visitForm.direccion} onChange={e => setVisitForm({...visitForm, direccion: e.target.value})} />
                        </div>
                        <div>
                          <Label>Tipo</Label>
                          <Select value={visitForm.tipo_visita} onValueChange={v => setVisitForm({...visitForm, tipo_visita: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="visita">Visita</SelectItem>
                              <SelectItem value="entrega">Entrega</SelectItem>
                              <SelectItem value="cobro">Cobro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="notas">Notas</Label>
                          <Input id="notas" value={visitForm.notas} onChange={e => setVisitForm({...visitForm, notas: e.target.value})} />
                        </div>
                        <Button className="w-full" onClick={handleAddVisit} disabled={!visitForm.vendedor_id || !visitForm.nombre_cliente}>
                          Guardar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {visitas.length === 0 ? (
                    <p className="text-center text-gray-500">No hay visitas registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {visitas.map(visita => (
                        <div key={visita.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-medium">{visita.nombre_cliente}</span>
                              <Badge variant={visita.estado === 'completada' ? 'default' : visita.estado === 'pendiente' ? 'secondary' : 'outline'}>
                                {visita.estado === 'completada' ? 'Completada' : visita.estado === 'pendiente' ? 'Pendiente' : 'En progreso'}
                              </Badge>
                              <Badge variant="outline">{visita.tipo_visita === 'visita' ? 'Visita' : visita.tipo_visita === 'entrega' ? 'Entrega' : 'Cobro'}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">Vendedor: {visita.nombre_vendedor}</p>
                            {visita.direccion && <p className="text-sm text-gray-500">{visita.direccion}</p>}
                            <p className="text-xs text-gray-400">{new Date(visita.fecha_creacion).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            {visita.estado !== 'completada' && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdateVisitStatus(visita.id, 'completada')}>
                                Completar
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteVisit(visita.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeSection === 'pedidos' && (
            <div className="p-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Pedidos</CardTitle>
                  <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Pedido
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Nuevo Pedido</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Vendedor *</Label>
                          <Select value={orderForm.vendedor_id} onValueChange={v => setOrderForm({...orderForm, vendedor_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar vendedor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendedores.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="order-cliente">Cliente *</Label>
                          <Input id="order-cliente" value={orderForm.nombre_cliente} onChange={e => setOrderForm({...orderForm, nombre_cliente: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="productos">Productos</Label>
                          <Input id="productos" value={orderForm.productos} onChange={e => setOrderForm({...orderForm, productos: e.target.value})} placeholder="Ej: 2x Producto A, 1x Producto B" />
                        </div>
                        <div>
                          <Label htmlFor="total">Monto Total (C$)</Label>
                          <Input id="total" type="number" step="0.01" value={orderForm.monto_total} onChange={e => setOrderForm({...orderForm, monto_total: e.target.value})} />
                        </div>
                        <Button className="w-full" onClick={handleAddOrder} disabled={!orderForm.vendedor_id || !orderForm.nombre_cliente}>
                          Guardar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {pedidos.length === 0 ? (
                    <p className="text-center text-gray-500">No hay pedidos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {pedidos.map(pedido => (
                        <div key={pedido.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-medium">{pedido.nombre_cliente}</span>
                              <Badge variant={pedido.estado === 'completado' ? 'default' : pedido.estado === 'pendiente' ? 'secondary' : 'outline'}>
                                {pedido.estado === 'completado' ? 'Completado' : pedido.estado === 'pendiente' ? 'Pendiente' : 'En proceso'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">Vendedor: {pedido.nombre_vendedor}</p>
                            {pedido.productos && <p className="text-sm text-gray-500">Productos: {pedido.productos}</p>}
                            <p className="text-lg font-bold text-green-600">C${pedido.monto_total.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{new Date(pedido.fecha_creacion).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            {pedido.estado !== 'completado' && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdateOrderStatus(pedido.id, 'completado')}>
                                Completar
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(pedido.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'clientes' && (
            <div className="p-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    Clientes Registrados ({clientes.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={exportClientesToExcel} className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button onClick={openOptimizedRoute} className="bg-blue-600 hover:bg-blue-700">
                      <Route className="h-4 w-4 mr-2" />
                      Ruta Optimizada
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientes.length === 0 ? (
                    <p className="text-center text-gray-500">No hay clientes registrados por los vendedores</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {clientes.map(cliente => (
                        <div key={cliente.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-blue-700">{cliente.nombre}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500">Cliente</Badge>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteCliente(cliente.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {cliente.direccion && (
                            <p className="text-sm text-gray-600 mb-1">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {cliente.direccion}
                            </p>
                          )}
                          {cliente.telefono && (
                            <p className="text-sm text-gray-600 mb-1">Tel: {cliente.telefono}</p>
                          )}
                          {cliente.notas && (
                            <p className="text-sm text-gray-500 italic mb-2">{cliente.notas}</p>
                          )}
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-xs text-gray-500">
                              Registrado por: <span className="font-semibold">{cliente.nombre_vendedor}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              Ubicacion: {cliente.latitud.toFixed(6)}, {cliente.longitud.toFixed(6)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Fecha: {new Date(cliente.fecha_creacion).toLocaleString()}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedCliente(cliente)
                                  setIsClienteDetailDialogOpen(true)
                                }}
                              >
                                Ver mas informacion
                              </Button>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${Number(cliente.latitud).toFixed(6)}%2C${Number(cliente.longitud).toFixed(6)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ backgroundColor: '#38bdf8', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', display: 'inline-block', textDecoration: 'none' }}
                              >
                                Ver en Google Maps
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input id="edit-nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="edit-telefono">Telefono</Label>
              <Input id="edit-telefono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="edit-correo">Correo</Label>
              <Input id="edit-correo" type="email" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={formData.estado} onValueChange={v => setFormData({...formData, estado: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleUpdateVendedor}>
              Actualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Ubicacion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Actualizando ubicacion de: {selectedVendedor?.nombre}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="loc-latitud">Latitud</Label>
                <Input id="loc-latitud" type="number" step="any" value={formData.latitud} onChange={e => setFormData({...formData, latitud: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="loc-longitud">Longitud</Label>
                <Input id="loc-longitud" type="number" step="any" value={formData.longitud} onChange={e => setFormData({...formData, longitud: e.target.value})} />
              </div>
            </div>
            <Button className="w-full" onClick={handleUpdateLocation} disabled={!formData.latitud || !formData.longitud}>
              Actualizar Ubicacion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isClienteDetailDialogOpen} onOpenChange={setIsClienteDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Informacion del Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-blue-700 mb-2">{selectedCliente.nombre}</h3>
                
                {selectedCliente.direccion && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Direccion:</span> {selectedCliente.direccion}
                  </p>
                )}
                
                {selectedCliente.telefono && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Telefono:</span> {selectedCliente.telefono}
                  </p>
                )}
                
                {selectedCliente.notas && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Notas:</span> {selectedCliente.notas}
                  </p>
                )}
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-700 mb-2">Informacion de la Granja</h4>
                
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Tipo de Animal:</span>{' '}
                  {selectedCliente.tipo_animal === 'ganado_bovino' ? 'Ganado Bovino' :
                   selectedCliente.tipo_animal === 'ganado_porcino' ? 'Ganado Porcino' :
                   selectedCliente.tipo_animal === 'aves' ? 'Aves (Pollos/Gallinas)' :
                   selectedCliente.tipo_animal === 'caprino' ? 'Caprino (Cabras)' :
                   selectedCliente.tipo_animal === 'ovino' ? 'Ovino (Ovejas)' :
                   selectedCliente.tipo_animal === 'equino' ? 'Equino (Caballos)' :
                   selectedCliente.tipo_animal === 'peces' ? 'Peces' :
                   selectedCliente.tipo_animal === 'otro' ? 'Otro' :
                   selectedCliente.tipo_animal || 'No especificado'}
                </p>
                
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Cantidad de Animales:</span>{' '}
                  {selectedCliente.cantidad_animales || 'No especificado'}
                </p>
                
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Administracion:</span>{' '}
                  {selectedCliente.administracion === 'propia' ? 'Lo administra el mismo' :
                   selectedCliente.administracion === 'delegada' ? 'Delega a alguien mas' :
                   selectedCliente.administracion || 'No especificado'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Ubicacion y Registro</h4>
                
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Coordenadas:</span>{' '}
                  {selectedCliente.latitud.toFixed(6)}, {selectedCliente.longitud.toFixed(6)}
                </p>
                
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Registrado por:</span>{' '}
                  {selectedCliente.nombre_vendedor || 'Desconocido'}
                </p>
                
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Fecha de registro:</span>{' '}
                  {new Date(selectedCliente.fecha_creacion).toLocaleString()}
                </p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => setIsClienteDetailDialogOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSelectVendedorLocationDialogOpen} onOpenChange={setIsSelectVendedorLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Vendedor para Registrar Ubicacion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Seleccione el vendedor cuya ubicacion desea registrar. Se solicitara acceso a su ubicacion actual.
            </p>
            <div>
              <Label>Vendedor *</Label>
              <Select value={selectedVendedorForLocation} onValueChange={setSelectedVendedorForLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              onClick={handleRequestLocationWithVendor} 
              disabled={!selectedVendedorForLocation}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Obtener y Registrar Ubicacion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
