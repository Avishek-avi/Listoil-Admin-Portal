"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTicketsAction, createTicketAction, searchUsersAction, getTicketTypesAction, getTicketStatusesAction, updateTicketAction, getTicketDetailsAction } from '@/actions/ticket-actions'
import { FileText, UserPlus, CheckCircle2, X } from 'lucide-react'
import { enqueueSnackbar } from 'notistack'

/* ── Reusable searchable user dropdown ── */
function UserAutocomplete({ value, onChange, options, onSearch, placeholder }: {
    value: any; onChange: (v: any) => void; options: any[]; onSearch: (t: string) => void; placeholder: string
}) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value) setInputValue(`${value.name} (${value.type})`)
        else setInputValue('')
    }, [value])

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <input type="text" value={inputValue} placeholder={placeholder}
                onChange={(e) => { setInputValue(e.target.value); onSearch(e.target.value); setOpen(true) }}
                onFocus={() => { if (options.length) setOpen(true) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
            {value && (
                <button type="button" onClick={() => { onChange(null); setInputValue('') }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            )}
            {open && options.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {options.map((opt: any) => (
                        <div key={opt.id} onClick={() => { onChange(opt); setInputValue(`${opt.name} (${opt.type})`); setOpen(false) }}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <p className="text-sm font-semibold">{opt.name}</p>
                            <p className="text-xs text-gray-500">{opt.type}{opt.uniqueId && opt.uniqueId !== 'N/A' ? ` • ID: ${opt.uniqueId}` : ''}{opt.phone ? ` • ${opt.phone}` : ''}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function TicketsClient() {
    const [activeTab, setActiveTab] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('All Priority')

    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"

    const { data: ticketStatuses = [] } = useQuery({
        queryKey: ['ticket-statuses'],
        queryFn: getTicketStatusesAction,
    })

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500)
        return () => clearTimeout(handler)
    }, [searchTerm])

    const currentStatusId = React.useMemo(() => {
        if (activeTab === 0 || !ticketStatuses.length) return undefined
        return ticketStatuses[activeTab - 1]?.id
    }, [activeTab, ticketStatuses])

    const { data: tickets = [], isLoading, error } = useQuery({
        queryKey: ['tickets', debouncedSearch, priorityFilter, currentStatusId],
        queryFn: () => getTicketsAction({
            searchTerm: debouncedSearch,
            priority: priorityFilter,
            statusId: currentStatusId
        }),
        staleTime: 60 * 1000,
    })

    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
    const [resolutionNotes, setResolutionNotes] = useState('')

    // For Assignment Modal
    const [selectedAssignee, setSelectedAssignee] = useState<any | null>(null)

    // Form State for Creation
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        priority: 'Medium',
        typeId: '',
        statusId: '',
        requester: null as any | null,
        assignee: null as any | null,
    })

    const [userSearchTerm, setUserSearchTerm] = useState('')
    const { data: searchResults = [] } = useQuery({
        queryKey: ['user-search', userSearchTerm],
        queryFn: () => searchUsersAction(userSearchTerm),
        staleTime: 30 * 1000,
    })

    const { data: ticketTypes = [] } = useQuery({
        queryKey: ['ticket-types'],
        queryFn: getTicketTypesAction,
    })

    const createMutation = useMutation({
        mutationFn: createTicketAction,
        onSuccess: (res) => {
            if (res.success) {
                enqueueSnackbar('Ticket created successfully', { variant: 'success' })
                setIsModalOpen(false)
                queryClient.invalidateQueries({ queryKey: ['tickets'] })
                setFormData({
                    subject: '',
                    description: '',
                    priority: 'Medium',
                    typeId: '',
                    statusId: '',
                    requester: null,
                    assignee: null,
                })
            } else {
                enqueueSnackbar(res.error || 'Failed to create ticket', { variant: 'error' })
            }
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => updateTicketAction(id, data),
        onSuccess: (res, variables) => {
            if (res.success) {
                if (variables.data.statusId) {
                    enqueueSnackbar('Ticket resolved successfully', { variant: 'success' })
                } else if (variables.data.assigneeId) {
                    enqueueSnackbar('Ticket assigned successfully', { variant: 'success' })
                } else {
                    enqueueSnackbar('Ticket updated successfully', { variant: 'success' })
                }
                setIsAssignModalOpen(false)
                setIsResolveModalOpen(false)
                queryClient.invalidateQueries({ queryKey: ['tickets'] })
                if (selectedTicketId) {
                    queryClient.invalidateQueries({ queryKey: ['ticket-details', selectedTicketId] })
                }
                setResolutionNotes('')
                setSelectedAssignee(null)
            } else {
                enqueueSnackbar(res.error || 'Failed to update ticket', { variant: 'error' })
            }
        }
    })

    const { data: ticketDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['ticket-details', selectedTicketId],
        queryFn: () => selectedTicketId ? getTicketDetailsAction(selectedTicketId) : null,
        enabled: !!selectedTicketId && isViewModalOpen,
    })

    const getPriorityColor = (p: string) => {
        if (p === 'High') return 'badge-danger'
        if (p === 'Medium') return 'badge-warning'
        return 'badge-success'
    }

    const getStatusColor = (s: string) => {
        if (s === 'Open') return 'badge-warning'
        if (s === 'In Progress') return 'badge-primary'
        if (s === 'Resolved') return 'badge-success'
        return 'badge-secondary'
    }

    const getBorderClass = (p: string) => {
        if (p === 'High') return 'border-l-4 border-l-red-500'
        if (p === 'Medium') return 'border-l-4 border-l-amber-500'
        if (p === 'Low') return 'border-l-4 border-l-emerald-500'
        return ''
    }

    const getPrioritySurface = (priority: string) => {
        if (priority === 'High') return 'from-red-50 to-red-100/60 border-red-200'
        if (priority === 'Medium') return 'from-amber-50 to-amber-100/60 border-amber-200'
        return 'from-emerald-50 to-emerald-100/60 border-emerald-200'
    }

    const getStatusDot = (status: string) => {
        if (status === 'Open') return 'bg-amber-500'
        if (status === 'In Progress') return 'bg-blue-500'
        if (status === 'Resolved') return 'bg-emerald-500'
        return 'bg-slate-500'
    }

    const getSlaInfo = (createdAt: string | Date | null | undefined, priority: string) => {
        if (!createdAt) return { elapsedHours: 0, tone: 'text-gray-500 bg-gray-100', label: 'No timestamp' }

        const elapsedHours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)))
        const threshold = priority === 'High' ? 8 : priority === 'Medium' ? 24 : 48

        if (elapsedHours >= threshold) {
            return { elapsedHours, tone: 'text-red-700 bg-red-100', label: 'SLA Breached' }
        }
        if (elapsedHours >= Math.floor(threshold * 0.7)) {
            return { elapsedHours, tone: 'text-amber-700 bg-amber-100', label: 'SLA At Risk' }
        }
        return { elapsedHours, tone: 'text-emerald-700 bg-emerald-100', label: 'SLA Healthy' }
    }

    const filteredTickets = tickets

    const handleCreate = () => {
        if (!formData.subject || !formData.description || !formData.typeId || !formData.statusId) {
            enqueueSnackbar('Please fill all required fields', { variant: 'warning' })
            return
        }
        createMutation.mutate({
            subject: formData.subject,
            description: formData.description,
            priority: formData.priority,
            typeId: Number(formData.typeId),
            statusId: Number(formData.statusId),
            createdBy: formData.requester?.id || 1,
            assigneeId: formData.assignee?.id || undefined,
        })
    }

    const handleView = (id: string) => {
        setSelectedTicketId(id)
        setIsViewModalOpen(true)
    }

    const handleOpenAssign = (id: string) => {
        const ticket = tickets.find((t: any) => t.id === id)
        if (!ticket) return;

        if (ticket.assigneeId) {
            setSelectedAssignee({
                id: ticket.assigneeId,
                name: ticket.assignedTo,
                type: ticket.assignedToType
            })
        } else {
            setSelectedAssignee(null)
        }
        setSelectedTicketId(ticket.id)
        setIsAssignModalOpen(true)
    }

    const handleOpenResolve = (id: string) => {
        const ticket = tickets.find((t: any) => t.id === id)
        setSelectedTicketId(ticket?.id || id)
        setResolutionNotes('')
        setIsResolveModalOpen(true)
    }

    const handleAssignSubmit = () => {
        if (!selectedTicketId || !selectedAssignee) return
        const ticket = tickets.find((t: any) => t.id === selectedTicketId)
        if (!ticket) return;

        updateMutation.mutate({
            id: ticket.dbId || Number(selectedTicketId.replace('TKT-', '')),
            data: { assigneeId: selectedAssignee.id }
        })
    }

    const handleResolveSubmit = () => {
        if (!selectedTicketId) return
        const ticket = tickets.find((t: any) => t.id === selectedTicketId)
        if (!ticket) return;

        const resolvedStatus = ticketStatuses.find((s: any) =>
            s.name.toLowerCase().trim() === 'resolved' || s.name.toLowerCase().trim() === 'closed'
        )
        if (!resolvedStatus) {
            enqueueSnackbar('Resolved status not found in configuration', { variant: 'error' })
            return
        }
        updateMutation.mutate({
            id: ticket.dbId || Number(selectedTicketId.replace('TKT-', '')),
            data: {
                statusId: resolvedStatus.id,
                resolutionNotes: resolutionNotes,
                resolvedAt: new Date().toISOString()
            }
        })
    }

    return (
        <div className="w-full">
            {/* ── Tabs ── */}
            <div className="border-b border-gray-200 mb-6">
                <div className="tabs">
                    <button className={`tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>All Tickets</button>
                    {ticketStatuses.map((status: any, i: number) => (
                        <button key={status.id} className={`tab ${activeTab === i + 1 ? 'active' : ''}`} onClick={() => setActiveTab(i + 1)}>{status.name}</button>
                    ))}
                </div>
            </div>

            {/* ── KPI Cards (All Tickets tab) ── */}
            {activeTab === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="widget-card p-6 rounded-xl shadow">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">Total Tickets</p>
                            <i className="fas fa-ticket-alt text-blue-500"></i>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{tickets.length}</h3>
                        <span className="text-sm text-gray-500">Real-time data</span>
                    </div>
                    <div className="widget-card p-6 rounded-xl shadow">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">Open Tickets</p>
                            <i className="fas fa-exclamation-circle text-orange-500"></i>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">
                            {tickets.filter((t: any) => (t.statusName || t.status) === 'Open').length}
                        </h3>
                        <span className="text-sm text-gray-500">requiring attention</span>
                    </div>
                    <div className="widget-card p-6 rounded-xl shadow">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">In Progress</p>
                            <i className="fas fa-spinner text-blue-500"></i>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">
                            {tickets.filter((t: any) => (t.statusName || t.status) === 'In Progress').length}
                        </h3>
                        <span className="text-sm text-gray-500">being worked on</span>
                    </div>
                    <div className="widget-card p-6 rounded-xl shadow">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">Resolved Today</p>
                            <i className="fas fa-check-circle text-green-500"></i>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">
                            {tickets.filter((t: any) => (t.statusName || t.status) === 'Resolved').length}
                        </h3>
                        <span className="text-sm text-gray-500">completed</span>
                    </div>
                </div>
            )}

            {/* ── Search / Filter Bar ── */}
            <div className="widget-card p-4 mb-6 rounded-xl shadow">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px]">
                        <input type="text" placeholder="Search tickets..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} className={inputClass} />
                    </div>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                        className={selectClass} style={{ width: 'auto' }}>
                        <option>All Priority</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                    </select>
                    <button onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary">
                        <i className="fas fa-plus mr-2"></i>Create Ticket
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    Failed to load tickets: {(error as Error).message}
                </div>
            )}

            {/* ── Tickets List ── */}
            <div className="widget-card p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        {activeTab === 0 ? 'All Tickets' :
                            activeTab === 1 ? 'Open Tickets' :
                                activeTab === 2 ? 'Tickets In Progress' :
                                    activeTab === 3 ? 'Resolved Tickets' : 'Closed Tickets'}
                    </h3>
                    <button className="btn btn-secondary">
                        <i className="fas fa-download mr-1"></i> Export
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredTickets.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No tickets found.</p>
                        ) : (
                            filteredTickets.map((ticket: any) => {
                                const priority = ticket.priority || 'Low'
                                const statusName = ticket.status?.name || ticket.status || 'Open'
                                const slaInfo = getSlaInfo(ticket.createdAt, priority)

                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => handleView(ticket.id)}
                                        className={`group relative overflow-hidden p-5 border rounded-2xl bg-gradient-to-r ${getPrioritySurface(priority)} hover:shadow-lg transition-all duration-300 cursor-pointer ${getBorderClass(priority)}`}
                                    >
                                        <div className="absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_65%)] pointer-events-none"></div>

                                        <div className="relative flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold tracking-wide px-2.5 py-1 rounded-full bg-white/80 border border-white shadow-sm">#{ticket.id}</span>
                                                <span className={`badge ${getPriorityColor(priority)}`}>{priority}</span>
                                                <span className={`badge ${getStatusColor(statusName)} inline-flex items-center gap-1.5`}>
                                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${getStatusDot(statusName)}`}></span>
                                                    {statusName}
                                                </span>
                                                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${slaInfo.tone}`}>
                                                    {slaInfo.label} • {slaInfo.elapsedHours}h
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>

                                        <h4 className="font-semibold mb-1 text-[15px] text-gray-900 group-hover:text-blue-700 transition-colors">
                                            {ticket.subject}
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                            {ticket.description || ticket.subject}
                                        </p>

                                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold border border-blue-200">
                                                    {ticket.requester?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{ticket.requester}</p>
                                                    <p className="text-xs text-gray-500">{ticket.requesterType}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleView(ticket.id) }}
                                                    className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <i className="fas fa-eye mr-1"></i>View
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenAssign(ticket.id) }}
                                                    className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <i className="fas fa-user-plus mr-1"></i>Assign
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenResolve(ticket.id) }}
                                                    className="text-xs font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <i className="fas fa-check-circle mr-1"></i>Resolve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-gray-500">Showing {filteredTickets.length} tickets</p>
                    <div className="flex gap-1">
                        <button className="btn btn-secondary btn-sm" disabled>Previous</button>
                        <button className="btn btn-primary btn-sm">1</button>
                        <button className="btn btn-secondary btn-sm">Next</button>
                    </div>
                </div>
            </div>

            {/* ══════ CREATE TICKET MODAL ══════ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 rounded-lg"><FileText className="text-blue-600" size={20} /></div>
                                <div>
                                    <h3 className="text-lg font-bold">Create New Ticket</h3>
                                    <p className="text-xs text-gray-500">Create a support request for a member</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
                        </div>

                        {/* Body */}
                        <div className="p-5 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                {/* Left – Ticket Details */}
                                <div className="md:col-span-7">
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 h-full">
                                        <h4 className="text-sm font-semibold mb-4">Ticket Details</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Subject *</label>
                                                <input type="text" placeholder="Brief summary of the issue" value={formData.subject}
                                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description *</label>
                                                <textarea rows={4} placeholder="Detailed information about the issue" value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Type *</label>
                                                    <select value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value })} className={selectClass}>
                                                        <option value="">Select type</option>
                                                        {ticketTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Priority</label>
                                                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={selectClass}>
                                                        <option value="Low">Low</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="High">High</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Initial Status *</label>
                                                <select value={formData.statusId} onChange={(e) => setFormData({ ...formData, statusId: e.target.value })} className={selectClass}>
                                                    <option value="">Select status</option>
                                                    {ticketStatuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right – People */}
                                <div className="md:col-span-5">
                                    <div className="space-y-4">
                                        <div className="bg-white p-5 rounded-xl border border-gray-200">
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                <UserPlus size={16} /> Requester
                                            </h4>
                                            <UserAutocomplete
                                                value={formData.requester}
                                                onChange={(v: any) => setFormData({ ...formData, requester: v })}
                                                options={searchResults.filter((u: any) => u.isLastLevel)}
                                                onSearch={setUserSearchTerm}
                                                placeholder="Search Name, ID, Phone..."
                                            />
                                            {formData.requester && (
                                                <div className="mt-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs">
                                                    Requester linked successfully
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200">
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                <UserPlus size={16} /> Assign To (Optional)
                                            </h4>
                                            <UserAutocomplete
                                                value={formData.assignee}
                                                onChange={(v: any) => setFormData({ ...formData, assignee: v })}
                                                options={searchResults.filter((u: any) => !u.isLastLevel)}
                                                onSearch={setUserSearchTerm}
                                                placeholder="Search Staff..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setIsModalOpen(false)}
                                className="btn btn-secondary">Cancel</button>
                            <button onClick={handleCreate} disabled={createMutation.isPending}
                                className="btn btn-primary disabled:opacity-50">
                                {createMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                                ) : 'Create Support Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ VIEW TICKET MODAL ══════ */}
            {isViewModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <FileText size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Ticket Details</h3>
                                    <p className="text-xs text-gray-500">Viewing information for #{selectedTicketId}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
                        </div>

                        {/* Content */}
                        <div className="bg-gray-50">
                            {isLoadingDetails ? (
                                <div className="flex justify-center p-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : ticketDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-12">
                                    {/* Main content */}
                                    <div className="md:col-span-8 p-6 bg-white">
                                        <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md">{ticketDetails.typeName}</span>
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ticketDetails.priority === 'High' ? 'bg-red-50 text-red-700' : ticketDetails.priority === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>{ticketDetails.priority}</span>
                                            </div>
                                            <h2 className="text-xl font-bold mb-3">{ticketDetails.subject}</h2>
                                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className="whitespace-pre-wrap leading-relaxed">{ticketDetails.description}</p>
                                            </div>

                                            {(ticketDetails.imageUrl || ticketDetails.videoUrl) && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-bold mb-3">Attachments</h4>
                                                    <div className="flex gap-3 flex-wrap">
                                                        {ticketDetails.imageUrl && (
                                                            <a href={ticketDetails.imageUrl} target="_blank" rel="noopener noreferrer"
                                                                className="w-[200px] h-[150px] rounded-xl overflow-hidden border border-gray-100 block hover:opacity-80 transition">
                                                                <img src={ticketDetails.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                                                            </a>
                                                        )}
                                                        {ticketDetails.videoUrl && (
                                                            <div className="w-full max-w-[400px] h-[250px] rounded-xl overflow-hidden border border-gray-100 bg-black">
                                                                <video src={ticketDetails.videoUrl} className="w-full h-full" controls />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {ticketDetails.resolutionNotes && (
                                            <div className="mt-6">
                                                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                    <CheckCircle2 size={18} className="text-emerald-500" /> Resolution Details
                                                </h4>
                                                <div className="p-4 rounded-xl bg-emerald-50/50 border border-dashed border-emerald-500">
                                                    <p className="text-xs text-gray-500 mb-1">
                                                        Resolved at: {new Date(ticketDetails.resolvedAt).toLocaleString()}
                                                    </p>
                                                    <p className="text-sm font-medium">{ticketDetails.resolutionNotes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar */}
                                    <div className="md:col-span-4 p-6 border-l border-gray-100">
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Statuses</p>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-500">Current Status</span>
                                                        <span className="badge badge-primary">{ticketDetails.statusName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-500">Created Date</span>
                                                        <span className="text-sm font-medium">{new Date(ticketDetails.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <hr className="border-gray-200" />
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">People Involved</p>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                                            {ticketDetails.requesterName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Requester ({ticketDetails.requesterTypeName})</p>
                                                            <p className="text-sm font-semibold">{ticketDetails.requesterName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                                                            {ticketDetails.assigneeName?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Assigned To {ticketDetails.assigneeTypeName ? `(${ticketDetails.assigneeTypeName})` : ''}</p>
                                                            <p className="text-sm font-semibold">{ticketDetails.assigneeName || 'Unassigned'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => setIsViewModalOpen(false)}
                                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm">Close</button>
                            {!ticketDetails?.resolvedAt && (
                                <>
                                    <button onClick={() => { setIsViewModalOpen(false); handleOpenResolve(selectedTicketId!) }}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium">Resolve Ticket</button>
                                    <button onClick={() => { setIsViewModalOpen(false); handleOpenAssign(selectedTicketId!) }}
                                        className="btn btn-primary btn-sm">Update Assignment</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ ASSIGN TICKET MODAL ══════ */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm">
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold">Assign Ticket</h3>
                            <p className="text-xs text-gray-500">Select a staff member to handle this ticket</p>
                        </div>
                        <div className="p-5">
                            <label className="text-xs font-semibold text-gray-500 mb-2 block">Assign To</label>
                            <UserAutocomplete
                                value={selectedAssignee}
                                onChange={setSelectedAssignee}
                                options={searchResults.filter((u: any) => !u.isLastLevel)}
                                onSearch={setUserSearchTerm}
                                placeholder="Search staff name..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 p-5 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                            <button onClick={() => setIsAssignModalOpen(false)}
                                className="btn btn-secondary">Cancel</button>
                            <button onClick={handleAssignSubmit} disabled={updateMutation.isPending || !selectedAssignee}
                                className="btn btn-primary disabled:opacity-50">
                                {updateMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                                ) : 'Assign Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ RESOLVE TICKET MODAL ══════ */}
            {isResolveModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm">
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-green-600">Resolve Ticket</h3>
                            <p className="text-xs text-gray-500">Provide details on how the issue was resolved</p>
                        </div>
                        <div className="p-5">
                            <label className="text-xs font-semibold text-gray-500 mb-2 block">Resolution Notes *</label>
                            <textarea rows={4} placeholder="Describe the solution..." value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex justify-end gap-3 p-5 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                            <button onClick={() => setIsResolveModalOpen(false)}
                                className="btn btn-secondary">Cancel</button>
                            <button onClick={handleResolveSubmit} disabled={updateMutation.isPending || !resolutionNotes}
                                className="btn btn-success disabled:opacity-50">
                                {updateMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                                ) : 'Confirm Resolution'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
