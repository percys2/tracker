import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Plus, Trash2, RefreshCw, ClipboardList, ShoppingCart, Menu, X, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('clientes')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isSelectVendedorLocationDialogOpen, setIsSelectVendedorLocationDialogOpen] = useState(false)
  const [selectedVendedorForLocation, setSelectedVendedorForLocation] = useState<string>('')
  const [isClienteDetailDialogOpen, setIsClienteDetailDialogOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  
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

  const vendedoresActivos = vendedores.filter(p => p.estado === 'activo')
  const totalVentas = pedidos.reduce((sum, o) => sum + (o.monto_total || 0), 0)

  const menuItems = [
    { id: 'clientes', label: 'Clientes', icon: UserCheck },
    { id: 'visitas', label: 'Visitas', icon: ClipboardList },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
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
          <Button variant="outline" size="sm" onClick={() => { fetchVendedores(); fetchVisitas(); fetchPedidos(); fetchClientes(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
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
              <CardHeader>
                <CardTitle>Clientes Registrados</CardTitle>
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
