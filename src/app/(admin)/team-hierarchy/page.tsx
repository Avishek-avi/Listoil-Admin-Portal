import React from 'react';
import TeamHierarchyClient from './TeamHierarchyClient';

export const metadata = {
    title: 'Team Hierarchy | Listoil Admin',
    description: 'View and manage team hierarchy across regions and cities.',
};

export default function TeamHierarchyPage() {
    return <TeamHierarchyClient />;
}
