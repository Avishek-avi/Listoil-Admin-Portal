'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    Grid, 
    Avatar, 
    Chip, 
    List, 
    ListItem, 
    ListItemAvatar, 
    ListItemText,
    Divider,
    Paper,
    CircularProgress,
    Breadcrumbs,
    Link,
    IconButton,
    InputBase,
    alpha
} from '@mui/material';
import { 
    Person as PersonIcon, 
    LocationOn as LocationIcon,
    ChevronRight as ChevronRightIcon,
    AccountTree as TreeIcon,
    Storefront as StorefrontIcon,
    Engineering as EngineeringIcon,
    Search as SearchIcon,
    ArrowBack as ArrowBackIcon,
    Badge as BadgeIcon,
    Groups as GroupsIcon,
    TableChart as TableChartIcon,
    FilterList as FilterListIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
} from '@mui/material';
import { getTeamHierarchyAction, TeamMember } from '@/actions/team-actions';

export default function TeamHierarchyClient() {
    const [isMounted, setIsMounted] = useState(false);
    const [fullHierarchy, setFullHierarchy] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Navigation State for Drill-down
    const [navigationStack, setNavigationStack] = useState<TeamMember[]>([]);

    useEffect(() => {
        setIsMounted(true);
        getTeamHierarchyAction()
            .then(data => {
                setFullHierarchy(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const currentLevelMembers = useMemo(() => {
        if (navigationStack.length === 0) return fullHierarchy;
        const current = navigationStack[navigationStack.length - 1];
        return current.children || [];
    }, [fullHierarchy, navigationStack]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return currentLevelMembers;
        return currentLevelMembers.filter(m => 
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.scopeName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [currentLevelMembers, searchQuery]);

    const handleDrillDown = (member: TeamMember) => {
        if (member.children && member.children.length > 0) {
            setNavigationStack([...navigationStack, member]);
            setSearchQuery('');
        }
    };

    const handleGoBack = () => {
        setNavigationStack(navigationStack.slice(0, -1));
    };

    const handleBreadcrumbClick = (index: number) => {
        setNavigationStack(navigationStack.slice(0, index + 1));
    };

    if (!isMounted) return null;

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header Section */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="h4" fontWeight="900" gutterBottom sx={{ color: '#1e293b', letterSpacing: '-0.02em' }}>
                        Team Hierarchy
                    </Typography>
                    <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />} aria-label="breadcrumb">
                        <Link 
                            component="button"
                            underline="hover" 
                            color={navigationStack.length === 0 ? "primary" : "inherit"}
                            onClick={() => setNavigationStack([])}
                            sx={{ fontWeight: navigationStack.length === 0 ? 700 : 400, fontSize: '0.875rem' }}
                        >
                            All Regions
                        </Link>
                        {navigationStack.map((member, index) => (
                            <Link
                                key={member.id}
                                component="button"
                                underline="hover"
                                color={index === navigationStack.length - 1 ? "primary" : "inherit"}
                                onClick={() => handleBreadcrumbClick(index)}
                                sx={{ fontWeight: index === navigationStack.length - 1 ? 700 : 400, fontSize: '0.875rem' }}
                            >
                                {member.name}
                            </Link>
                        ))}
                    </Breadcrumbs>
                </Box>

                {/* Search Bar */}
                <Paper
                    sx={{
                        p: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        width: 300,
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <IconButton sx={{ p: '10px' }} aria-label="search">
                        <SearchIcon />
                    </IconButton>
                    <InputBase
                        sx={{ ml: 1, flex: 1, fontSize: '0.875rem' }}
                        placeholder="Search team members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </Paper>
            </Box>

            {/* Current Context Banner */}
            {navigationStack.length > 0 && (
                <Box mb={3} display="flex" alignItems="center">
                    <IconButton onClick={handleGoBack} sx={{ mr: 2, bgcolor: 'white', shadow: 1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                            Currently Viewing Under
                        </Typography>
                        <Typography variant="h6" fontWeight="700">
                            {navigationStack[navigationStack.length - 1].name} 
                            <span className="text-gray-400 font-normal ml-2 text-sm">
                                ({navigationStack[navigationStack.length - 1].role})
                            </span>
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* Table View of Members */}
            {filteredMembers.length === 0 ? (
                <Paper sx={{ p: 8, textAlign: 'center', borderRadius: '24px', bgcolor: alpha('#f1f5f9', 0.5), border: '2px dashed #cbd5e1' }}>
                    <GroupsIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">No members found in this level.</Typography>
                    <Typography variant="body2" color="textSecondary">Try adjusting your search or navigation.</Typography>
                </Paper>
            ) : (
                <TableContainer 
                    component={Paper} 
                    sx={{ 
                        borderRadius: '20px', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}
                >
                    <Table sx={{ minWidth: 650 }} aria-label="team hierarchy table">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#64748b', py: 2.5 }}>MEMBER</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>ROLE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>LOCATION / SCOPE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#64748b' }} align="center">MAPPED MEMBERS</TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredMembers.map((member) => (
                                <HierarchyTableRow 
                                    key={member.id} 
                                    member={member} 
                                    onDrillDown={() => handleDrillDown(member)} 
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}

function HierarchyTableRow({ member, onDrillDown }: { member: TeamMember, onDrillDown: () => void }) {
    const hasChildren = member.children && member.children.length > 0;
    
    const roleColors: Record<string, string> = {
        'SALES HEAD': '#0f172a',
        'TSM': '#3b82f6',
        'SR': '#8b5cf6',
        'Distributor': '#0ea5e9',
        'Retailer': '#10b981',
        'Mechanic': '#f59e0b'
    };

    const roleIcons: Record<string, React.ReactNode> = {
        'SALES HEAD': <GroupsIcon sx={{ fontSize: '1.2rem' }} />,
        'TSM': <BadgeIcon sx={{ fontSize: '1.2rem' }} />,
        'SR': <PersonIcon sx={{ fontSize: '1.2rem' }} />,
        'Distributor': <StorefrontIcon sx={{ fontSize: '1.2rem' }} />,
        'Retailer': <StorefrontIcon sx={{ fontSize: '1.2rem' }} />,
        'Mechanic': <EngineeringIcon sx={{ fontSize: '1.2rem' }} />
    };

    const color = roleColors[member.role] || '#64748b';

    return (
        <TableRow
            hover
            onClick={hasChildren ? onDrillDown : undefined}
            sx={{ 
                cursor: hasChildren ? 'pointer' : 'default',
                '&:hover': {
                    bgcolor: alpha(color, 0.02) + ' !important'
                },
                transition: 'background-color 0.2s'
            }}
        >
            <TableCell sx={{ py: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                        sx={{ 
                            bgcolor: alpha(color, 0.1), 
                            color: color,
                            width: 44, 
                            height: 44,
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '1rem'
                        }}
                    >
                        {member.name.charAt(0)}
                    </Avatar>
                    <Box>
                        <Typography variant="body1" fontWeight="700" sx={{ color: '#1e293b' }}>
                            {member.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
                            ID: #{Math.abs(member.id).toString().slice(-6)}
                        </Typography>
                    </Box>
                </Box>
            </TableCell>
            <TableCell>
                <Chip 
                    icon={roleIcons[member.role] || <PersonIcon />}
                    label={member.role}
                    size="small"
                    sx={{ 
                        bgcolor: alpha(color, 0.1), 
                        color: color, 
                        fontWeight: 700,
                        borderRadius: '8px',
                        '& .MuiChip-icon': { color: color }
                    }} 
                />
            </TableCell>
            <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                    <LocationIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} />
                    <Box>
                        <Typography variant="body2" fontWeight="600" color="textPrimary">
                            {member.scopeName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            {member.scopeType}
                        </Typography>
                    </Box>
                </Box>
            </TableCell>
            <TableCell align="center">
                {hasChildren ? (
                    <Box 
                        sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            bgcolor: '#f1f5f9', 
                            px: 2, 
                            py: 0.5, 
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0'
                        }}
                    >
                        <Typography variant="body2" fontWeight="700" color="primary">
                            {member.children?.length}
                        </Typography>
                        <Typography variant="caption" sx={{ ml: 0.5, color: '#64748b', fontWeight: 600 }}>
                            Mapped
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" color="textDisabled" sx={{ fontWeight: 600 }}>
                        Leaf Node
                    </Typography>
                )}
            </TableCell>
            <TableCell align="right">
                {hasChildren && (
                    <IconButton size="small" sx={{ color: '#94a3b8' }}>
                        <ChevronRightIcon />
                    </IconButton>
                )}
            </TableCell>
        </TableRow>
    );
}

