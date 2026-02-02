import { useState, useEffect, useRef } from 'react'
import { registerPlugin, Capacitor } from '@capacitor/core'
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Plus, Trash2, RefreshCw, ClipboardList, ShoppingCart, Menu, X, UserCheck } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')
const TRACKING_INTERVAL_MS = 30_000

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

function App() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [visitas, setVisitas] = useState<VisitaConNombre[]>([])
  const [pedidos, setPedidos] = useState<PedidoConNombre[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isFetchingVendedores, setIsFetchingVendedores] = useState(false)
  const [vendedoresError, setVendedoresError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const lastSentAtRef = useRef<number>(0)
  const webWatchIdRef = useRef<number | null>(null)
  const [activeSection, setActiveSection] = useState('clientes')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false)
  const [isSelectVendedorLocationDialogOpen, setIsSelectVendedorLocationDialogOpen] = useState(false)
  const [selectedVendedorForLocation, setSelectedVendedorForLocation] = useState<string>('')
  const [isClienteDetailDialogOpen, setIsClienteDetailDialogOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [isGettingClienteLocation, setIsGettingClienteLocation] = useState(false)
  
  const [clienteForm, setClienteForm] = useState({
    vendedor_id: '',
    nombre: '',
    direccion: '',
    telefono: '',
    notas: '',
    latitud: '',
    longitud: '',
    tipo_animal: '',
    cantidad_animales: '',
    administracion: ''
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
    if (!supabase) return
    setIsFetchingVendedores(true)
    setVendedoresError(null)
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      setVendedores(data || [])
    } catch (error) {
      console.error('Error fetching vendedores:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error)
      setVendedoresError(errorMessage || 'Error al cargar vendedores')
    } finally {
      setIsFetchingVendedores(false)
    }
  }
  
  const fetchVisitas = async () => {
    if (!supabase) return
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
    if (!supabase) return
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
    if (!supabase) return
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

  const getSelectedVendedorId = () => {
    const id = parseInt(selectedVendedorForLocation)
    return Number.isNaN(id) ? null : id
  }

  const insertUbicacion = async (
    vendedorId: number,
    latitude: number,
    longitude: number,
    accuracy: number | null,
    timeMs?: number | null
  ) => {
    if (!supabase) return
    const fecha = new Date(timeMs ?? Date.now()).toISOString()
    const { error } = await supabase
      .from('ubicaciones')
      .insert({
        vendedor_id: vendedorId,
        latitud: latitude,
        longitud: longitude,
        precision_metros: accuracy ?? null,
        fecha_registro: fecha
      })
    if (error) throw error
  }

  const recordLocationThrottled = async (
    vendedorId: number,
    latitude: number,
    longitude: number,
    accuracy: number | null,
    timeMs?: number | null
  ) => {
    const now = timeMs ?? Date.now()
    if (now - lastSentAtRef.current < TRACKING_INTERVAL_MS) return
    lastSentAtRef.current = now
    try {
      await insertUbicacion(vendedorId, latitude, longitude, accuracy, timeMs ?? null)
    } catch (error) {
      console.error('Error saving location:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error)
      setTrackingError(errorMessage || 'Error al guardar ubicacion')
    }
  }

  const startTracking = async () => {
    if (!supabase) return
    if (isTracking) return
    const vendedorId = getSelectedVendedorId()
    if (!vendedorId) {
      setTrackingError('Seleccione un vendedor valido')
      return
    }
    setTrackingError(null)
    lastSentAtRef.current = 0

    if (Capacitor.isNativePlatform()) {
      try {
        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Compartiendo ubicacion cada 30s.',
            backgroundTitle: 'Rastreo activo',
            requestPermissions: true,
            stale: false,
            distanceFilter: 0
          },
          (location, error) => {
            if (error) {
              console.error('Background geolocation error:', error)
              setTrackingError(error.message || 'Error de ubicacion')
              return
            }
            if (!location) return
            void recordLocationThrottled(
              vendedorId,
              location.latitude,
              location.longitude,
              location.accuracy ?? null,
              location.time ?? null
            )
          }
        )
        setTrackingId(id)
        setIsTracking(true)
      } catch (error) {
        console.error('Error starting tracking:', error)
        setTrackingError('No se pudo iniciar el rastreo')
      }
      return
    }

    if (!navigator.geolocation) {
      setTrackingError('La geolocalizacion no esta soportada en este dispositivo')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void recordLocationThrottled(
          vendedorId,
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy ?? null,
          position.timestamp
        )
      },
      (error) => {
        console.error('Geolocation error:', error)
        setTrackingError(error.message || 'Error al obtener ubicacion')
      },
      { enableHighAccuracy: true }
    )
    webWatchIdRef.current = watchId
    setIsTracking(true)
  }

  const stopTracking = async () => {
    setTrackingError(null)
    if (Capacitor.isNativePlatform() && trackingId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: trackingId })
      } catch (error) {
        console.error('Error stopping tracking:', error)
      }
      setTrackingId(null)
    }
    if (webWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(webWatchIdRef.current)
      webWatchIdRef.current = null
    }
    setIsTracking(false)
  }

  useEffect(() => {
    const client = supabase
    if (!client) return
    fetchVendedores()
    fetchVisitas()
    fetchPedidos()
    fetchClientes()
    
    const vendedoresChannel = client
      .channel('vendedores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores' }, () => {
        fetchVendedores()
      })
      .subscribe()
    
    const ubicacionesChannel = client
      .channel('ubicaciones-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ubicaciones' }, async (payload) => {
        const ubicacion = payload.new as any
        await client
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
      client.removeChannel(vendedoresChannel)
      client.removeChannel(ubicacionesChannel)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (trackingId) {
        BackgroundGeolocation.removeWatcher({ id: trackingId }).catch(() => {})
      }
      if (webWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(webWatchIdRef.current)
      }
    }
  }, [trackingId])

  const handleAddVisit = async () => {
    if (!supabase) return
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
    if (!supabase) return
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
    if (!supabase) return
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
    if (!supabase) return
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
    if (!supabase) return
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
    if (!supabase) return
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
    if (!supabase) return
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

  const handleGetClienteLocation = () => {
    setIsGettingClienteLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setClienteForm(prev => ({
            ...prev,
            latitud: latitude.toString(),
            longitud: longitude.toString()
          }))
          setIsGettingClienteLocation(false)
          alert('Ubicacion capturada exitosamente')
        },
        (error) => {
          console.error('Error getting location:', error)
          setIsGettingClienteLocation(false)
          alert('No se pudo obtener la ubicacion. Por favor, verifique los permisos de ubicacion.')
        },
        { enableHighAccuracy: true }
      )
    } else {
      setIsGettingClienteLocation(false)
      alert('La geolocalizacion no esta soportada en este navegador.')
    }
  }

  const handleAddCliente = async () => {
    if (!clienteForm.vendedor_id || !clienteForm.nombre || !clienteForm.latitud || !clienteForm.longitud) {
      alert('Por favor complete los campos requeridos: Vendedor, Nombre y Ubicacion')
      return
    }
    if (!supabase) return
    try {
      const { error } = await supabase
        .from('clientes')
        .insert([{
          vendedor_id: parseInt(clienteForm.vendedor_id),
          nombre: clienteForm.nombre,
          direccion: clienteForm.direccion || null,
          telefono: clienteForm.telefono || null,
          notas: clienteForm.notas || null,
          latitud: parseFloat(clienteForm.latitud),
          longitud: parseFloat(clienteForm.longitud),
          tipo_animal: clienteForm.tipo_animal || null,
          cantidad_animales: clienteForm.cantidad_animales ? parseInt(clienteForm.cantidad_animales) : null,
          administracion: clienteForm.administracion || null
        }])
      
      if (error) throw error
      setClienteForm({
        vendedor_id: '',
        nombre: '',
        direccion: '',
        telefono: '',
        notas: '',
        latitud: '',
        longitud: '',
        tipo_animal: '',
        cantidad_animales: '',
        administracion: ''
      })
      setIsClienteDialogOpen(false)
      fetchClientes()
      alert('Cliente registrado exitosamente')
    } catch (error) {
      console.error('Error adding cliente:', error)
      alert('Error al registrar el cliente')
    }
  }

  const handleRequestLocationWithVendor = () => {
    const vendedorId = getSelectedVendedorId()
    if (!vendedorId) return
    if (!supabase) return
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            await insertUbicacion(
              vendedorId,
              latitude,
              longitude,
              position.coords.accuracy ?? null,
              position.timestamp
            )
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

  const vendedoresActivos = vendedores.filter(p => p.estado === 'activo')
  const totalVentas = pedidos.reduce((sum, o) => sum + (o.monto_total || 0), 0)

  const menuItems = [
    { id: 'clientes', label: 'Clientes', icon: UserCheck },
    { id: 'visitas', label: 'Visitas', icon: ClipboardList },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
  ]

  if (!isSupabaseConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '680px', backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>Configuracion requerida</h1>
          <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 16px' }}>
            Faltan las variables de entorno de Supabase. Agregalas en tu archivo .env y reinicia el servidor de desarrollo.
          </p>
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            VITE_SUPABASE_URL=tu_url_de_supabase{'\n'}VITE_SUPABASE_ANON_KEY=tu_anon_key
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '12px 0 0' }}>Archivo: .env</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
      <aside
        className="app-sidebar"
        data-open={sidebarOpen ? 'true' : 'false'}
        style={{ 
          width: sidebarOpen ? '256px' : '0px', 
          backgroundColor: '#1a1a2e', 
          color: 'white', 
          transition: 'width 0.3s',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', width: '256px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #333' }}>
            <div style={{ backgroundColor: '#10b981', padding: '8px', borderRadius: '8px' }}>
              <MapPin style={{ height: '24px', width: '24px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontWeight: 'bold', fontSize: '18px', color: 'white', margin: 0 }}>App Vendedores</h1>
              <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Nicaragua</p>
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

      <div
        className="app-backdrop"
        data-open={sidebarOpen ? 'true' : 'false'}
        onClick={() => setSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header className="app-header" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
          <Button variant="outline" size="sm" onClick={() => { fetchVendedores(); fetchVisitas(); fetchPedidos(); fetchClientes(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </header>

        <main className="app-main" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {activeSection === 'visitas' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Visitas</CardTitle>
                <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Nueva Visita</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Nueva Visita</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Vendedor *</Label>
                        <Select value={visitForm.vendedor_id} onValueChange={(v) => setVisitForm({...visitForm, vendedor_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                          <SelectContent>
                            {vendedores.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nombre del Cliente *</Label>
                        <Input value={visitForm.nombre_cliente} onChange={(e) => setVisitForm({...visitForm, nombre_cliente: e.target.value})} />
                      </div>
                      <div>
                        <Label>Direccion</Label>
                        <Input value={visitForm.direccion} onChange={(e) => setVisitForm({...visitForm, direccion: e.target.value})} />
                      </div>
                      <div>
                        <Label>Tipo de Visita</Label>
                        <Select value={visitForm.tipo_visita} onValueChange={(v) => setVisitForm({...visitForm, tipo_visita: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visita">Visita</SelectItem>
                            <SelectItem value="seguimiento">Seguimiento</SelectItem>
                            <SelectItem value="cobranza">Cobranza</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notas</Label>
                        <Input value={visitForm.notas} onChange={(e) => setVisitForm({...visitForm, notas: e.target.value})} />
                      </div>
                      <Button className="w-full" onClick={handleAddVisit} disabled={!visitForm.vendedor_id || !visitForm.nombre_cliente}>
                        Registrar Visita
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visitas.map(visita => (
                    <div key={visita.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{visita.nombre_cliente}</p>
                          <p className="text-sm text-gray-500">{visita.direccion}</p>
                          <p className="text-xs text-gray-400">Por: {visita.nombre_vendedor}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={visita.estado === 'completada' ? 'default' : visita.estado === 'cancelada' ? 'destructive' : 'secondary'}>
                            {visita.estado}
                          </Badge>
                          <Select value={visita.estado} onValueChange={(v) => handleUpdateVisitStatus(visita.id, v)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="completada">Completada</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteVisit(visita.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visitas.length === 0 && <p className="text-center text-gray-500 py-8">No hay visitas registradas</p>}
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeSection === 'pedidos' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pedidos</CardTitle>
                <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Nuevo Pedido</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Nuevo Pedido</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Vendedor *</Label>
                        <Select value={orderForm.vendedor_id} onValueChange={(v) => setOrderForm({...orderForm, vendedor_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                          <SelectContent>
                            {vendedores.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nombre del Cliente *</Label>
                        <Input value={orderForm.nombre_cliente} onChange={(e) => setOrderForm({...orderForm, nombre_cliente: e.target.value})} />
                      </div>
                      <div>
                        <Label>Productos</Label>
                        <Input value={orderForm.productos} onChange={(e) => setOrderForm({...orderForm, productos: e.target.value})} />
                      </div>
                      <div>
                        <Label>Monto Total (C$)</Label>
                        <Input type="number" value={orderForm.monto_total} onChange={(e) => setOrderForm({...orderForm, monto_total: e.target.value})} />
                      </div>
                      <Button className="w-full" onClick={handleAddOrder} disabled={!orderForm.vendedor_id || !orderForm.nombre_cliente}>
                        Registrar Pedido
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pedidos.map(pedido => (
                    <div key={pedido.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{pedido.nombre_cliente}</p>
                          <p className="text-sm text-gray-500">{pedido.productos}</p>
                          <p className="text-xs text-gray-400">Por: {pedido.nombre_vendedor}</p>
                          <p className="font-bold text-green-600">C${pedido.monto_total?.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={pedido.estado === 'entregado' ? 'default' : pedido.estado === 'cancelado' ? 'destructive' : 'secondary'}>
                            {pedido.estado}
                          </Badge>
                          <Select value={pedido.estado} onValueChange={(v) => handleUpdateOrderStatus(pedido.id, v)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="entregado">Entregado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteOrder(pedido.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pedidos.length === 0 && <p className="text-center text-gray-500 py-8">No hay pedidos registrados</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'clientes' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Clientes Registrados</CardTitle>
                <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Vendedor *</Label>
                        <Select value={clienteForm.vendedor_id} onValueChange={(v) => setClienteForm({...clienteForm, vendedor_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                          <SelectContent>
                            {vendedores.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nombre del Cliente *</Label>
                        <Input value={clienteForm.nombre} onChange={(e) => setClienteForm({...clienteForm, nombre: e.target.value})} />
                      </div>
                      <div>
                        <Label>Telefono</Label>
                        <Input value={clienteForm.telefono} onChange={(e) => setClienteForm({...clienteForm, telefono: e.target.value})} />
                      </div>
                      <div>
                        <Label>Direccion</Label>
                        <Input value={clienteForm.direccion} onChange={(e) => setClienteForm({...clienteForm, direccion: e.target.value})} />
                      </div>
                      <div>
                        <Label>Tipo de Animal</Label>
                        <Select value={clienteForm.tipo_animal} onValueChange={(v) => setClienteForm({...clienteForm, tipo_animal: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ganado_bovino">Ganado Bovino</SelectItem>
                            <SelectItem value="ganado_porcino">Ganado Porcino</SelectItem>
                            <SelectItem value="aves">Aves (Pollos/Gallinas)</SelectItem>
                            <SelectItem value="caprino">Caprino (Cabras)</SelectItem>
                            <SelectItem value="ovino">Ovino (Ovejas)</SelectItem>
                            <SelectItem value="equino">Equino (Caballos)</SelectItem>
                            <SelectItem value="peces">Peces</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Cantidad de Animales</Label>
                        <Input type="number" value={clienteForm.cantidad_animales} onChange={(e) => setClienteForm({...clienteForm, cantidad_animales: e.target.value})} />
                      </div>
                      <div>
                        <Label>Administracion</Label>
                        <Select value={clienteForm.administracion} onValueChange={(v) => setClienteForm({...clienteForm, administracion: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="propia">Lo administra el mismo</SelectItem>
                            <SelectItem value="delegada">Delega a alguien mas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notas</Label>
                        <Input value={clienteForm.notas} onChange={(e) => setClienteForm({...clienteForm, notas: e.target.value})} />
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <Label className="mb-2 block">Ubicacion del Cliente *</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full mb-2"
                          onClick={handleGetClienteLocation}
                          disabled={isGettingClienteLocation}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          {isGettingClienteLocation ? 'Obteniendo ubicacion...' : 'Capturar Ubicacion GPS'}
                        </Button>
                        {clienteForm.latitud && clienteForm.longitud && (
                          <p className="text-sm text-green-600 text-center">
                            Ubicacion: {parseFloat(clienteForm.latitud).toFixed(6)}, {parseFloat(clienteForm.longitud).toFixed(6)}
                          </p>
                        )}
                      </div>
                      <Button className="w-full" onClick={handleAddCliente}>Registrar Cliente</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientes.map(cliente => (
                    <div key={cliente.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div 
                          className="cursor-pointer flex-1"
                          onClick={() => {
                            setSelectedCliente(cliente)
                            setIsClienteDetailDialogOpen(true)
                          }}
                        >
                          <p className="font-semibold">{cliente.nombre}</p>
                          <p className="text-sm text-gray-500">{cliente.direccion}</p>
                          <p className="text-sm text-gray-500">{cliente.telefono}</p>
                          <p className="text-xs text-gray-400">Registrado por: {cliente.nombre_vendedor}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCliente(cliente.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {clientes.length === 0 && <p className="text-center text-gray-500 py-8">No hay clientes registrados</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <nav className="app-bottom-nav" role="navigation" aria-label="Secciones">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className="app-bottom-tab"
            data-active={activeSection === item.id ? 'true' : 'false'}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setIsSelectVendedorLocationDialogOpen(true)}
          className="app-bottom-tab app-bottom-action"
        >
          <MapPin className="h-5 w-5" />
          <span>Ubicacion</span>
        </button>
      </nav>

      <Dialog
        open={isSelectVendedorLocationDialogOpen}
        onOpenChange={(open) => {
          setIsSelectVendedorLocationDialogOpen(open)
          if (open) {
            fetchVendedores()
          }
        }}
      >
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
              <Select
                value={selectedVendedorForLocation}
                onValueChange={setSelectedVendedorForLocation}
                disabled={isTracking}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.length === 0 ? (
                    <SelectItem value="__no_vendedores__" disabled>
                      No hay vendedores registrados
                    </SelectItem>
                  ) : (
                    vendedores.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.nombre}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {vendedoresError ? (
              <p className="text-sm text-red-600">{vendedoresError}</p>
            ) : vendedores.length === 0 && !isFetchingVendedores ? (
              <p className="text-sm text-gray-500">
                No se encontraron vendedores en la tabla. Verifica tu conexion y permisos en Supabase.
              </p>
            ) : null}
            {trackingError ? <p className="text-sm text-red-600">{trackingError}</p> : null}
            <p className={`text-sm ${isTracking ? 'text-green-600' : 'text-gray-500'}`}>
              {isTracking ? 'Seguimiento activo (cada 30s)' : 'Seguimiento detenido'}
            </p>
            {!Capacitor.isNativePlatform() && (
              <p className="text-xs text-amber-600">
                El seguimiento continuo solo funciona en la app instalada (Android/iOS).
              </p>
            )}
            <Button variant="outline" size="sm" onClick={fetchVendedores} disabled={isFetchingVendedores}>
              {isFetchingVendedores ? 'Actualizando...' : 'Recargar vendedores'}
            </Button>
            <Button
              className="w-full"
              onClick={startTracking}
              disabled={!selectedVendedorForLocation || isTracking}
            >
              Iniciar Seguimiento (30s)
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={stopTracking}
              disabled={!isTracking}
            >
              Detener Seguimiento
            </Button>
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

      <Dialog open={isClienteDetailDialogOpen} onOpenChange={setIsClienteDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-2">Informacion de Contacto</h4>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Nombre:</span> {selectedCliente.nombre}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Telefono:</span> {selectedCliente.telefono || 'No especificado'}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Direccion:</span> {selectedCliente.direccion || 'No especificada'}
                </p>
                {selectedCliente.notas && (
                  <p className="text-sm text-gray-600">
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
    </div>
  )
}

export default App
