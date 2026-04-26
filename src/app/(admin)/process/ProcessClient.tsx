"use client"

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProcessDataAction } from '@/actions/process-actions'
import {
    getAdminOrdersAction, updateAdminOrderStatusAction,
    AdminOrder,
} from '@/actions/marketplace-actions'
import {
    Box, Grid, Typography, Tabs, Tab, Button, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, TextField, Menu, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, CircularProgress, Snackbar,
    Alert, Select, FormControl, InputLabel, Divider, Stepper,
    Step, StepLabel, Tooltip, Paper,
} from '@mui/material'
import { MoreVert, Refresh, FilterList, Download, LocalShipping, CheckCircle, Schedule, CancelOutlined } from '@mui/icons-material'
import {
    getOrderStatusTransitions,
} from '@/lib/order-status'
import AmazonProductsClient from './AmazonProductsClient'

// ─── Status helpers ───────────────────────────────────────────────────────────
const ORDER_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    processing: { bg: '#FFF3E0', color: '#E65100', label: 'Processing' },
    confirmed: { bg: '#E3F2FD', color: '#1565C0', label: 'Confirmed' },
    shipped: { bg: '#FFF8E1', color: '#F57F17', label: 'Shipped' },
    delivered: { bg: '#E8F5E9', color: '#2E7D32', label: 'Delivered' },
    cancelled: { bg: '#FFEBEE', color: '#C62828', label: 'Cancelled' },
}



function StatusChip({ status, type = 'order' }: { status: string; type?: 'order' | 'redemption' }) {
    const map = ORDER_STATUS_COLORS
    const style = map[status] || { bg: '#F5F5F5', color: '#616161', label: status }
    return (
        <Chip
            label={style.label}
            size="small"
            sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.72rem', height: 22, border: `1px solid ${style.color}30` }}
        />
    )
}

const ORDER_STEPS = ['Processing', 'Confirmed', 'Shipped', 'Delivered']
function getStepIndex(status: string) {
    const map: Record<string, number> = { processing: 0, confirmed: 1, shipped: 2, delivered: 3 }
    return map[status?.toLowerCase()] ?? 0
}

// ─── Pagination Component ─────────────────────────────────────────────────────
function TablePagination({ page, totalPages, total, limit, onPageChange }: {
    page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void
}) {
    const start = total === 0 ? 0 : (page - 1) * limit + 1
    const end = Math.min(page * limit, total)
    return (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
                Showing {start}–{end} of {total} entries
            </Typography>
            <Box display="flex" gap={0.5}>
                <Button size="small" variant="outlined" disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.primary', minWidth: 80 }}>
                    Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1
                    return (
                        <Button key={p} size="small" variant={p === page ? 'contained' : 'outlined'}
                            onClick={() => onPageChange(p)}
                            sx={{ minWidth: 36, textTransform: 'none', borderColor: 'divider' }}>
                            {p}
                        </Button>
                    )
                })}
                {totalPages > 5 && <Typography sx={{ alignSelf: 'center', px: 1 }}>...</Typography>}
                <Button size="small" variant="outlined" disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.primary', minWidth: 80 }}>
                    Next
                </Button>
            </Box>
        </Box>
    )
}

// ─── Order Update Dialog ──────────────────────────────────────────────────────
function OrderUpdateDialog({ order, open, onClose, onSuccess }: {
    order: AdminOrder | null; open: boolean; onClose: () => void; onSuccess: () => void
}) {
    const [status, setStatus] = useState('')
    const [notes, setNotes] = useState('')
    const [carrier, setCarrier] = useState('')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [estimatedDelivery, setEstimatedDelivery] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    React.useEffect(() => {
        if (order) {
            setStatus('')
            setNotes('')
            setCarrier((order.trackingDetails as any)?.carrier || '')
            setTrackingNumber((order.trackingDetails as any)?.trackingNumber || '')
            setEstimatedDelivery(order.estimatedDelivery || '')
            setError('')
        }
    }, [order])

    if (!order) return null
    const transitions = getOrderStatusTransitions(order.orderStatus || 'processing')
    const currentStep = getStepIndex(order.orderStatus || 'processing')
    const isShipping = status === 'shipped' || status === 'delivered'

    const handleSubmit = async () => {
        if (!status) { setError('Please select a new status'); return }
        setLoading(true); setError('')
        const result = await updateAdminOrderStatusAction(order.orderId, status, {
            notes, carrier: carrier || undefined,
            trackingNumber: trackingNumber || undefined,
            estimatedDelivery: estimatedDelivery || undefined,
        })
        setLoading(false)
        if (result.success) { onSuccess(); onClose() }
        else setError(result.error || 'Update failed')
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>Update Order Status</Typography>
                <Typography variant="body2" color="text.secondary">Order #{order.orderId?.slice(-10)}</Typography>
            </DialogTitle>
            <DialogContent dividers>
                {/* Progress Stepper */}
                <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 3 }}>
                    {ORDER_STEPS.map((lbl) => (
                        <Step key={lbl}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.72rem' } }}>{lbl}</StepLabel></Step>
                    ))}
                </Stepper>

                <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                    <Box flex={1} minWidth={120}>
                        <Typography variant="caption" color="text.secondary">User</Typography>
                        <Typography variant="body2" fontWeight={600}>{order.userName || '—'}</Typography>
                    </Box>
                    {/* <Box flex={1} minWidth={120}>
                        <Typography variant="caption" color="text.secondary">Required / Available Points</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={600}>{order.pointsDeducted}</Typography>
                            <Typography variant="caption" color="text.secondary">/</Typography>
                            <Typography variant="body2" fontWeight={600} color={(order.userPoints || 0) < order.pointsDeducted ? 'error.main' : 'success.main'}>
                                {order.userPoints ?? 0}
                            </Typography>
                        </Box>
                        {(order.userPoints || 0) < order.pointsDeducted && (
                            <Typography variant="caption" color="error.main" display="block">
                                Insufficient balance
                            </Typography>
                        )}
                    </Box> */}
                    <Box flex={1} minWidth={120}>
                        <Typography variant="caption" color="text.secondary">Current Status</Typography>
                        <Box mt={0.5}><StatusChip status={order.orderStatus || 'processing'} type="order" /></Box>
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* Delivery Address */}
                {order.shippingDetails && (
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: '#FAFAFA' }}>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Delivery Address</Typography>
                        <Typography variant="body2">
                            {(order.shippingDetails as any).name} — {(order.shippingDetails as any).street}, {(order.shippingDetails as any).city}, {(order.shippingDetails as any).state} {(order.shippingDetails as any).zipCode}
                        </Typography>
                    </Paper>
                )}

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>New Status *</InputLabel>
                            <Select value={status} label="New Status *" onChange={(e) => setStatus(e.target.value)}>
                                {transitions.length === 0 && <MenuItem disabled>No transitions available (terminal state)</MenuItem>}
                                {transitions.map(t => (
                                    <MenuItem key={t} value={t}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <StatusChip status={t} type="order" />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Carrier fields appear when shipping */}
                    {(isShipping || status === 'shipped') && (
                        <>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField fullWidth size="small" label="Carrier" value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Blue Dart" />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField fullWidth size="small" label="Tracking Number" value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField fullWidth size="small" type="date" label="Estimated Delivery"
                                    InputLabelProps={{ shrink: true }} value={estimatedDelivery}
                                    onChange={(e) => setEstimatedDelivery(e.target.value)} />
                            </Grid>
                        </>
                    )}

                    <Grid size={{ xs: 12 }}>
                        <TextField fullWidth size="small" label="Notes (optional)" value={notes}
                            onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
                    </Grid>
                </Grid>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading || !status}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ textTransform: 'none', minWidth: 140 }}>
                    {loading ? 'Updating…' : 'Update Status'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}



// ─── Order View Dialog ────────────────────────────────────────────────────────
function OrderViewDialog({ order, open, onClose }: { order: AdminOrder | null; open: boolean; onClose: () => void }) {
    if (!order) return null
    const addr = order.shippingDetails as any
    const tracking = order.trackingDetails as any

    // Collect all status history from items
    const allHistory: Array<{ status: string; date: string; notes?: string; carrier?: string; trackingNumber?: string }> = []
    order.items?.forEach(item => {
        if (Array.isArray(item.statusHistory)) {
            item.statusHistory.forEach(h => { if (!allHistory.find(x => x.status === h.status && x.date === h.date)) allHistory.push(h) })
        }
    })
    allHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Order Details</Typography>
                        <Typography variant="body2" color="text.secondary">#{order.orderId}</Typography>
                    </Box>
                    <StatusChip status={order.orderStatus || 'processing'} type="order" />
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Stepper activeStep={getStepIndex(order.orderStatus || 'processing')} alternativeLabel sx={{ mb: 3 }}>
                    {ORDER_STEPS.map(lbl => <Step key={lbl}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.72rem' } }}>{lbl}</StepLabel></Step>)}
                </Stepper>

                <Grid container spacing={2} mb={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">Customer</Typography>
                            <Typography variant="body2" fontWeight={600}>{order.userName || '—'}</Typography>
                            <Typography variant="body2" color="text.secondary">{order.userPhone}</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">Shipping Address</Typography>
                            {addr ? (
                                <Typography variant="body2">{addr.name}, {addr.street}, {addr.city}, {addr.state} {addr.zipCode}</Typography>
                            ) : <Typography variant="body2">—</Typography>}
                        </Paper>
                    </Grid>
                    {tracking && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary">Tracking</Typography>
                                {tracking.carrier && <Typography variant="body2">Carrier: <strong>{tracking.carrier}</strong></Typography>}
                                {tracking.trackingNumber && <Typography variant="body2">No: <strong>{tracking.trackingNumber}</strong></Typography>}
                            </Paper>
                        </Grid>
                    )}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">Points / Delivery</Typography>
                            <Typography variant="body2">Points: <strong>{order.pointsDeducted}</strong></Typography>
                            {order.estimatedDelivery && <Typography variant="body2">ETA: <strong>{new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}</strong></Typography>}
                            {order.deliveredAt && <Typography variant="body2" color="success.main">Delivered: {new Date(order.deliveredAt).toLocaleDateString('en-IN')}</Typography>}
                        </Paper>
                    </Grid>
                </Grid>

                {/* Items */}
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Items ({order.items?.length})</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase' } }}>
                                <TableCell>Product</TableCell><TableCell>SKU</TableCell>
                                <TableCell align="center">Qty</TableCell><TableCell align="right">Points</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {order.items?.map(item => (
                                <TableRow key={item.orderItemId}>
                                    <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{item.productName}</Typography></TableCell>
                                    <TableCell><Typography variant="caption" color="text.secondary">{item.asinSku}</Typography></TableCell>
                                    <TableCell align="center">{item.quantity}</TableCell>
                                    <TableCell align="right">{item.totalPoints}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Status Timeline */}
                {allHistory.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>Status Timeline</Typography>
                        {allHistory.map((h, i) => (
                            <Box key={i} display="flex" gap={2} mb={1} alignItems="flex-start">
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.6, flexShrink: 0 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>{h.status?.toUpperCase()}</Typography>
                                    <Typography variant="caption" color="text.secondary">{new Date(h.date).toLocaleString('en-IN')}</Typography>
                                    {h.notes && <Typography variant="caption" color="text.secondary" display="block">{h.notes}</Typography>}
                                </Box>
                            </Box>
                        ))}
                    </>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
        </Dialog>
    )
}

// ─── Amazon Orders Tab Content ────────────────────────────────────────────────
function AmazonOrdersTab() {
    const [subTab, setSubTab] = useState<'pending' | 'delivered'>('pending')
    const [page, setPage] = useState(1)
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
    const [viewOpen, setViewOpen] = useState(false)
    const [updateOpen, setUpdateOpen] = useState(false)
    const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' })
    const queryClient = useQueryClient()

    const queryKey = ['admin-orders', subTab, page]
    const { data, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: () => getAdminOrdersAction({
            page,
            limit: 20,
            ...(subTab === 'pending' ? { excludeStatus: 'delivered' } : { status: 'delivered' }),
        }),
        staleTime: 30_000,
    })

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
        setToast({ open: true, msg: 'Order status updated successfully!', type: 'success' })
    }

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

    return (
        <Box>
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity={toast.type} variant="filled" onClose={() => setToast(p => ({ ...p, open: false }))}>{toast.msg}</Alert>
            </Snackbar>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={subTab} onChange={(_, v) => { setSubTab(v); setPage(1) }}
                    sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 } }}>
                    <Tab label="Redemption Requests" value="pending" icon={<Schedule fontSize="small" />} iconPosition="start" />
                    <Tab label="Completed / Delivered" value="delivered" icon={<CheckCircle fontSize="small" />} iconPosition="start" />
                </Tabs>
            </Box>

            <div className="widget-card p-6">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" fontWeight={600}>
                        {subTab === 'pending' ? 'Pending Amazon Orders' : 'Delivered Orders'}
                        {data?.pagination?.total !== undefined && (
                            <Chip label={data.pagination.total} size="small" sx={{ ml: 1, fontWeight: 700 }} color={subTab === 'pending' ? 'warning' : 'success'} />
                        )}
                    </Typography>
                    <Tooltip title="Refresh"><IconButton onClick={() => refetch()} size="small"><Refresh fontSize="small" /></IconButton></Tooltip>
                </Box>

                <TableContainer sx={{ boxShadow: 'none' }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow sx={{ '& th': { borderBottom: '1px solid #f1f5f9', fontSize: '0.72rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' } }}>
                                <TableCell>Order ID</TableCell><TableCell>Customer</TableCell>
                                <TableCell>Status</TableCell><TableCell>Points</TableCell>
                                <TableCell>Tracking</TableCell><TableCell>Date</TableCell><TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
                            ) : data?.data?.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No orders found.</TableCell></TableRow>
                            ) : data?.data?.map((order) => {
                                const tracking = order.trackingDetails as any
                                return (
                                    <TableRow key={order.orderId} hover sx={{ '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                                        <TableCell sx={{ fontWeight: 500, maxWidth: 140 }}>
                                            <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{order.orderId?.slice(-10)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>{order.userName || '—'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{order.userPhone}</Typography>
                                        </TableCell>
                                        <TableCell><StatusChip status={order.orderStatus || 'processing'} type="order" /></TableCell>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{order.pointsDeducted}</Typography></TableCell>
                                        <TableCell>
                                            {tracking?.trackingNumber
                                                ? <Typography variant="caption" fontFamily="monospace">{tracking.trackingNumber}</Typography>
                                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(order.createdAt)}</TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" gap={0.5} justifyContent="center">
                                                <Tooltip title="View Details">
                                                    <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.3, minWidth: 50 }}
                                                        onClick={() => { setSelectedOrder(order); setViewOpen(true) }}>View</Button>
                                                </Tooltip>
                                                {subTab === 'pending' && getOrderStatusTransitions(order.orderStatus || 'processing').length > 0 && (
                                                    <Tooltip title="Update Status">
                                                        <Button size="small" variant="contained" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.3, minWidth: 62 }}
                                                            onClick={() => { setSelectedOrder(order); setUpdateOpen(true) }}>Update</Button>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {data?.pagination && (
                    <TablePagination page={page} totalPages={data.pagination.totalPages}
                        total={data.pagination.total} limit={data.pagination.limit} onPageChange={setPage} />
                )}
            </div>

            <OrderViewDialog order={selectedOrder} open={viewOpen} onClose={() => setViewOpen(false)} />
            <OrderUpdateDialog order={selectedOrder} open={updateOpen} onClose={() => setUpdateOpen(false)} onSuccess={handleSuccess} />
        </Box>
    )
}



// ─── Standard Redemptions Tab ─────────────────────────────────────────────────
function StandardRedemptionsTab({ data }: { data: any }) {
    const [page, setPage] = useState(1)
    const limit = 20
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [selectedReq, setSelectedReq] = useState<any>(null)
    const [viewOpen, setViewOpen] = useState(false)

    const allReqs = data?.redemptionRequests || []
    const pagedReqs = allReqs.slice((page - 1) * limit, page * limit)
    const total = allReqs.length

    const getAvatarColor = (color: string) => {
        const colors: any = { blue: '#dbeafe', green: '#dcfce7', purple: '#f3e8ff', yellow: '#fef9c3', orange: '#ffedd5', red: '#fee2e2' }
        const textColors: any = { blue: '#1e40af', green: '#166534', purple: '#6b21a8', yellow: '#854d0e', orange: '#9a3412', red: '#991b1b' }
        return { bg: colors[color] || colors.blue, text: textColors[color] || textColors.blue }
    }

    return (
        <Box>
            {/* Stats */}
            <Grid container spacing={3} mb={4}>
                {[
                    { label: 'Pending Redemptions', value: data?.redemptionStats?.pendingRedemptions, color: 'text-orange-500', icon: 'fa-clock' },
                    { label: 'Approved Today', value: data?.redemptionStats?.approvedRedemptionsToday, color: 'text-green-500', icon: 'fa-check-circle' },
                    { label: 'Rejected Today', value: data?.redemptionStats?.rejectedRedemptionsToday, color: 'text-red-500', icon: 'fa-times-circle' },
                    { label: 'Total Value Today', value: data?.redemptionStats?.totalValueToday, color: 'text-blue-500', icon: 'fa-rupee-sign' },
                ].map((s, i) => (
                    <Grid key={i} size={{ xs: 12, md: 6, lg: 3 }}>
                        <div className="widget-card p-6">
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle2" color="text.secondary">{s.label}</Typography>
                                <i className={`fas ${s.icon} ${s.color}`} />
                            </Box>
                            <Typography variant="h4" fontWeight="bold" mb={1}>{s.value ?? 0}</Typography>
                        </div>
                    </Grid>
                ))}
            </Grid>

            <div className="widget-card p-6">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" fontWeight={600}>Pending Redemption Requests
                        <Chip label={total} size="small" sx={{ ml: 1, fontWeight: 700 }} color="warning" />
                    </Typography>
                </Box>
                <TableContainer sx={{ boxShadow: 'none' }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow sx={{ '& th': { borderBottom: '1px solid #f1f5f9', fontSize: '0.72rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' } }}>
                                <TableCell>Request ID</TableCell><TableCell>User</TableCell>
                                <TableCell>Points</TableCell><TableCell>Value</TableCell>
                                <TableCell>Date/Time</TableCell><TableCell>Type</TableCell><TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pagedReqs.map((req: any) => {
                                const { bg, text } = getAvatarColor(req.color)
                                return (
                                    <TableRow key={req.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                                        <TableCell sx={{ fontWeight: 500 }}>{req.id}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center">
                                                <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.75rem', bgcolor: bg, color: text, fontWeight: 600 }}>{req.initials}</Avatar>
                                                <Typography variant="body2">{req.user}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{req.points}</TableCell>
                                        <TableCell>{req.value}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{req.dateTime}</TableCell>
                                        <TableCell>{req.redemptionType}</TableCell>
                                        <TableCell>
                                            <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                onClick={() => { setSelectedReq(req); setViewOpen(true) }}>View</Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {pagedReqs.length === 0 && (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No pending redemptions.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination page={page} totalPages={Math.ceil(total / limit)} total={total} limit={limit} onPageChange={setPage} />
            </div>

            {/* View Dialog */}
            <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Redemption Request Details</DialogTitle>
                <DialogContent dividers>
                    {selectedReq && (
                        <Box display="flex" flexDirection="column" gap={1.5}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Request ID</Typography>
                                <Typography variant="body2" fontWeight={600}>{selectedReq.id}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">User</Typography>
                                <Typography variant="body2" fontWeight={600}>{selectedReq.user}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Points</Typography>
                                <Typography variant="body2" fontWeight={600}>{selectedReq.points}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Value</Typography>
                                <Typography variant="body2" fontWeight={600}>{selectedReq.value}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Type</Typography>
                                <Chip label={selectedReq.redemptionType} size="small" />
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Date</Typography>
                                <Typography variant="body2">{selectedReq.dateTime}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
            </Dialog>
        </Box>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
// ─── Scan/Transaction Tab Content ─────────────────────────────────────────────
function ScanTransactionTab({ data }: { data: any }) {
    const getAvatarColor = (color: string) => {
        const colors: any = {
            blue: '#dbeafe', green: '#dcfce7', purple: '#f3e8ff', yellow: '#fef9c3', orange: '#ffedd5', red: '#fee2e2'
        };
        const textColors: any = {
            blue: '#1e40af', green: '#166534', purple: '#6b21a8', yellow: '#854d0e', orange: '#9a3412', red: '#991b1b'
        };
        return { bg: colors[color] || colors.blue, text: textColors[color] || textColors.blue };
    };

    return (
        <div>
            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Pending Requests</p>
                        <i className="fas fa-clock text-orange-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.scanStats.pendingRequests}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-orange-600 font-medium">{data.scanStats.pendingRequestsToday}</span>
                        <span className="text-gray-500 ml-2">today</span>
                    </div>
                </div>
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Approved Today</p>
                        <i className="fas fa-check-circle text-green-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.scanStats.approvedToday}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-green-600 font-medium">{data.scanStats.approvedTodayTrend}</span>
                        <span className="text-gray-500 ml-2">from yesterday</span>
                    </div>
                </div>
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Rejected Today</p>
                        <i className="fas fa-times-circle text-red-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.scanStats.rejectedToday}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-red-600 font-medium">{data.scanStats.rejectedTodayTrend}</span>
                        <span className="text-gray-500 ml-2">from yesterday</span>
                    </div>
                </div>
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Total Processed</p>
                        <i className="fas fa-chart-line text-blue-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.scanStats.totalProcessed}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-blue-600 font-medium">{data.scanStats.totalProcessedTrend}</span>
                        <span className="text-gray-500 ml-2">this week</span>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>User</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Date/Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.scanRequests.map((req: any) => {
                            const { bg, text } = getAvatarColor(req.color);
                            return (
                                <tr key={req.id}>
                                    <td className="py-3 text-sm font-medium">{req.id}</td>
                                    <td className="py-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: bg, color: text }}>
                                                {req.initials}
                                            </div>
                                            <span>{req.user}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-sm">
                                        <span className={`badge ${req.type === 'Scan' ? 'badge-primary' : 'badge-success'}`}>{req.type}</span>
                                    </td>
                                    <td className="py-3 text-sm">{req.amount}</td>
                                    <td className="py-3 text-sm text-gray-500">{req.dateTime}</td>
                                    <td className="py-3 text-sm">
                                        <div className="flex gap-3">
                                            <button className="btn btn-success btn-sm">Approve</button>
                                            <button className="btn btn-danger btn-sm">Reject</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {data.scanRequests.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">
                                    No pending scan or transaction requests.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-500">
                    Showing 1 to {data.scanRequests.length} of {data.scanStats.pendingRequests} entries
                </p>
                <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" disabled>Previous</button>
                    <button className="btn btn-primary btn-sm">1</button>
                    <button className="btn btn-secondary btn-sm" disabled>Next</button>
                </div>
            </div>
        </div>
    )
}

// ─── Redemption Tab Content ───────────────────────────────────────────────────
function RedemptionTab({ data }: { data: any }) {
    const getAvatarColor = (color: string) => {
        const colors: any = {
            blue: '#dbeafe', green: '#dcfce7', purple: '#f3e8ff', yellow: '#fef9c3', orange: '#ffedd5', red: '#fee2e2'
        };
        const textColors: any = {
            blue: '#1e40af', green: '#166534', purple: '#6b21a8', yellow: '#854d0e', orange: '#9a3412', red: '#991b1b'
        };
        return { bg: colors[color] || colors.blue, text: textColors[color] || textColors.blue };
    };

    return (
        <div>
            {/* REDEMPTION STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Pending Redemptions</p>
                        <i className="fas fa-clock text-orange-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.redemptionStats.pendingRedemptions}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-orange-600 font-medium">{data.redemptionStats.pendingRedemptionsToday}</span>
                        <span className="text-gray-500 ml-2">today</span>
                    </div>
                </div>
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Approved Today</p>
                        <i className="fas fa-check-circle text-green-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.redemptionStats.approvedRedemptionsToday}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-green-600 font-medium">{data.redemptionStats.approvedRedemptionsTodayTrend}</span>
                        <span className="text-gray-500 ml-2">from yesterday</span>
                    </div>
                </div>
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Rejected Today</p>
                        <i className="fas fa-times-circle text-red-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.redemptionStats.rejectedRedemptionsToday}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-red-600 font-medium">{data.redemptionStats.rejectedRedemptionsTodayTrend}</span>
                        <span className="text-gray-500 ml-2">from yesterday</span>
                    </div>
                </div>
                <div className="widget-card p-6">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-500">Total Value Today</p>
                        <i className="fas fa-rupee-sign text-blue-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{data.redemptionStats.totalValueToday}</h3>
                    <div className="flex items-center text-sm">
                        <span className="text-blue-600 font-medium">{data.redemptionStats.totalValueTodayTrend}</span>
                        <span className="text-gray-500 ml-2">from yesterday</span>
                    </div>
                </div>
            </div>

                    {/* REDEMPTION TABLE */}
                    <div className="widget-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Pending Redemption Requests</h3>
                            <div className="flex gap-2">
                                <button className="btn btn-secondary btn-sm">
                                    <i className="fas fa-filter"></i> Filter
                                </button>
                                <button className="btn btn-secondary btn-sm">
                                    <i className="fas fa-download"></i> Export
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Request ID</th>
                                        <th>User</th>
                                        <th>Points</th>
                                        <th>Value</th>
                                        <th>Date/Time</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.redemptionRequests.map((req: any) => {
                                        const { bg, text } = getAvatarColor(req.color);
                                        return (
                                            <tr key={req.id}>
                                                <td className="py-3 text-sm font-medium">{req.id}</td>
                                                <td className="py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: bg, color: text }}>
                                                            {req.initials}
                                                        </div>
                                                        <span>{req.user}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-sm">{req.points}</td>
                                                <td className="py-3 text-sm">{req.value}</td>
                                                <td className="py-3 text-sm text-gray-500">{req.dateTime}</td>
                                                <td className="py-3 text-sm">
                                                    <div className="flex gap-3">
                                                        <button className="btn btn-success btn-sm">Approve</button>
                                                        <button className="btn btn-danger btn-sm">Reject</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        <div className="flex justify-between items-center mt-4">
                            <p className="text-sm text-gray-500">Showing 1 to 3 of 28 entries</p>
                            <div className="flex gap-1">
                                <button className="btn btn-secondary btn-sm">Previous</button>
                                <button className="btn btn-primary btn-sm">1</button>
                                <button className="btn btn-secondary btn-sm">2</button>
                                <button className="btn btn-secondary btn-sm">Next</button>
                            </div>
                        </div>
                    </div>
        </div>
    )
}

export default function ProcessClient() {
    const { data } = useQuery({
        queryKey: ['process-data'],
        queryFn: () => getProcessDataAction(),
        staleTime: 60 * 1000,
    });

    if (!data) return null;

    const [activeTab, setActiveTab] = useState(0);
    const tabLabels = ['Redemption Requests', 'Orders', 'Amazon Marketplace', 'Manual Entry'];

    return (
        <div className="w-full">
            {/* TABS */}
            <div className="tabs mb-6">
                {tabLabels.map((label, i) => (
                    <button key={label} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{label}</button>
                ))}
            </div>

            {/* Redemption Tab */}
            {activeTab === 0 && <RedemptionTab data={data} />}

            {/* Orders Tab */}
            {activeTab === 1 && <AmazonOrdersTab />}

            {/* Amazon Marketplace Tab */}
            {activeTab === 2 && <AmazonProductsClient />}

            {/* Manual Entry Tab */}
            {activeTab === 3 && (
                <div>
                    <div className="widget-card p-8 max-w-2xl mx-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Points Entry</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-1">Select Member</label>
                                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                                    <option>Search for member...</option>
                                    <option>John Doe (RT-001)</option>
                                    <option>Alice Smith (EL-042)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Entry Type</label>
                                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                                    <option>Scan Adjustment</option>
                                    <option>Bonus Points</option>
                                    <option>Referral Reward</option>
                                    <option>Correction</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Points / Amount</label>
                                <input type="number" placeholder="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-1">Reason / Remarks</label>
                                <textarea rows={4} placeholder="Enter reason for manual entry..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"></textarea>
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 mt-1">
                                <button className="btn btn-secondary">Cancel</button>
                                <button className="btn btn-primary">Submit Entry</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
