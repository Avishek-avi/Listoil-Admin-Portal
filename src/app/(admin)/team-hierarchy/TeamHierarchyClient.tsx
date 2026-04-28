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
    Groups as GroupsIcon
} from '@mui/icons-material';
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

            {/* Grid of Members */}
            {filteredMembers.length === 0 ? (
                <Paper sx={{ p: 8, textAlign: 'center', borderRadius: '24px', bgcolor: alpha('#f1f5f9', 0.5), border: '2px dashed #cbd5e1' }}>
                    <GroupsIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">No members found in this level.</Typography>
                    <Typography variant="body2" color="textSecondary">Try adjusting your search or navigation.</Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {filteredMembers.map((member) => (
                        <Grid item xs={12} sm={6} lg={4} key={member.id}>
                            <MemberDrillCard 
                                member={member} 
                                onDrillDown={() => handleDrillDown(member)}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}

function MemberDrillCard({ member, onDrillDown }: { member: TeamMember, onDrillDown: () => void }) {
    const hasChildren = member.children && member.children.length > 0;
    
    const roleColors: Record<string, string> = {
        'TSM': '#3b82f6',
        'SR': '#8b5cf6',
        'Retailer': '#10b981',
        'Mechanic': '#f59e0b'
    };

    const roleIcons: Record<string, React.ReactNode> = {
        'TSM': <BadgeIcon />,
        'SR': <PersonIcon />,
        'Retailer': <StorefrontIcon />,
        'Mechanic': <EngineeringIcon />
    };

    const color = roleColors[member.role] || '#64748b';

    return (
        <Card 
            onClick={hasChildren ? onDrillDown : undefined}
            sx={{ 
                height: '100%', 
                borderRadius: '20px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: hasChildren ? 'pointer' : 'default',
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'visible',
                '&:hover': hasChildren ? {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${alpha(color, 0.1)}`,
                    borderColor: color
                } : {}
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                    <Avatar 
                        sx={{ 
                            bgcolor: alpha(color, 0.1), 
                            color: color,
                            width: 52, 
                            height: 52,
                            borderRadius: '16px',
                            mr: 2
                        }}
                    >
                        {roleIcons[member.role] || <PersonIcon />}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="800" sx={{ color: '#1e293b', lineHeight: 1.2 }}>
                            {member.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: color, fontWeight: 700, textTransform: 'uppercase' }}>
                            {member.role}
                        </Typography>
                    </Box>
                    {hasChildren && (
                        <IconButton size="small" sx={{ bgcolor: '#f8fafc' }}>
                            <ChevronRightIcon />
                        </IconButton>
                    )}
                </Box>

                <Divider sx={{ my: 2, opacity: 0.5 }} />

                <Box display="flex" flexDirection="column" gap={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <LocationIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                        <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                            {member.scopeName}
                        </Typography>
                    </Box>
                    
                    {hasChildren && (
                        <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    bgcolor: alpha(color, 0.05), 
                                    px: 1.5, 
                                    py: 0.5, 
                                    borderRadius: '8px' 
                                }}
                            >
                                <Typography variant="caption" sx={{ color: color, fontWeight: 700 }}>
                                    {member.children?.length} Members Mapped
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </CardContent>
            
            {/* Role indicator strip */}
            <Box 
                sx={{ 
                    position: 'absolute', 
                    top: 20, 
                    right: -4, 
                    width: 4, 
                    height: 40, 
                    bgcolor: color, 
                    borderRadius: '4px 0 0 4px' 
                }} 
            />
        </Card>
    );
}

