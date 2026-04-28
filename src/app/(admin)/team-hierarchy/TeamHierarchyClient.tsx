'use client'

import React, { useEffect, useState } from 'react';
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
    Tabs,
    Tab
} from '@mui/material';
import { 
    Group as GroupIcon, 
    Person as PersonIcon, 
    LocationOn as LocationIcon,
    ChevronRight as ChevronRightIcon,
    AccountTree as TreeIcon,
    Build as BuildIcon,
    Store as StoreIcon,
    Engineering as EngineeringIcon,
    Storefront as StorefrontIcon
} from '@mui/icons-material';
import { getTeamHierarchyAction, TeamMember } from '@/actions/team-actions';

export default function TeamHierarchyClient() {
    const [isMounted, setIsMounted] = useState(false);
    const [hierarchy, setHierarchy] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        getTeamHierarchyAction()
            .then(data => {
                setHierarchy(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (!isMounted) {
        return null;
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                    <TreeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Team Hierarchy
                </Typography>
                <Breadcrumbs aria-label="breadcrumb">
                    <Link underline="hover" color="inherit" href="/dashboard">Dashboard</Link>
                    <Typography color="text.primary">Team Hierarchy</Typography>
                </Breadcrumbs>
            </Box>

            {hierarchy.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="textSecondary">No team members found in your scope.</Typography>
                </Paper>
            ) : (
                <Grid container spacing={4}>
                    {hierarchy.map((member) => (
                        <Grid item xs={12} md={member.role === 'SR' ? 12 : 6} key={member.id}>
                            <MemberCard member={member} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}

function MemberCard({ member }: { member: TeamMember }) {
    const [tabValue, setTabValue] = useState(0);

    const mechanics = member.children?.filter(c => c.role === 'Mechanic') || [];
    const retailers = member.children?.filter(c => c.role === 'Retailer') || [];
    const srs = member.children?.filter(c => c.role === 'SR') || [];

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Card sx={{ 
            height: '100%', 
            borderLeft: '6px solid', 
            borderColor: member.role === 'TSM' ? 'primary.main' : 'secondary.main',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2
        }}>
            <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ 
                        bgcolor: member.role === 'TSM' ? 'primary.main' : 'secondary.main', 
                        mr: 2, 
                        width: 56, 
                        height: 56 
                    }}>
                        {member.name.substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">{member.name}</Typography>
                        <Chip 
                            size="small" 
                            label={member.role} 
                            color={member.role === 'TSM' ? 'primary' : 'secondary'}
                            variant="outlined" 
                            sx={{ mr: 1 }}
                        />
                        <Chip 
                            size="small" 
                            icon={<LocationIcon fontSize="small" />} 
                            label={`${member.scopeType}: ${member.scopeName}`} 
                            color="default"
                        />
                    </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {member.role === 'SR' ? (
                    <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                            <Tabs 
                                value={tabValue} 
                                onChange={handleTabChange} 
                                aria-label="SR mapped members"
                                indicatorColor="secondary"
                                textColor="secondary"
                            >
                                <Tab icon={<EngineeringIcon />} iconPosition="start" label={`Mechanics (${mechanics.length})`} />
                                <Tab icon={<StorefrontIcon />} iconPosition="start" label={`Retailers (${retailers.length})`} />
                            </Tabs>
                        </Box>
                        
                        {tabValue === 0 && (
                            <MemberList 
                                members={mechanics} 
                                icon={<EngineeringIcon color="action" />} 
                                emptyMessage="No mechanics mapped to this territory."
                            />
                        )}
                        {tabValue === 1 && (
                            <MemberList 
                                members={retailers} 
                                icon={<StorefrontIcon color="action" />} 
                                emptyMessage="No retailers mapped to this territory."
                            />
                        )}
                    </>
                ) : (
                    <>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                            MAPPED SALES REPRESENTATIVES ({srs.length})
                        </Typography>
                        <MemberList 
                            members={srs} 
                            icon={<PersonIcon color="action" />} 
                            emptyMessage="No SRs mapped to this territory."
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function MemberList({ members, icon, emptyMessage }: { members: TeamMember[], icon: React.ReactNode, emptyMessage: string }) {
    if (members.length === 0) {
        return (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', py: 2 }}>
                {emptyMessage}
            </Typography>
        );
    }

    return (
        <List sx={{ maxHeight: '400px', overflowY: 'auto' }}>
            {members.map((m) => (
                <ListItem key={m.id} sx={{ 
                    mb: 1, 
                    bgcolor: 'rgba(0,0,0,0.02)', 
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                }}>
                    <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'background.paper', color: 'text.secondary' }}>
                            {icon}
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                        primary={m.name}
                        secondary={`${m.scopeType}: ${m.scopeName}`}
                    />
                    <ChevronRightIcon color="disabled" />
                </ListItem>
            ))}
        </List>
    );
}

