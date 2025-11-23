import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { User as UserIcon, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react';

interface TeamViewProps {
    currentUser: User;
}

export const TeamView: React.FC<TeamViewProps> = ({ currentUser }) => {
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            const snapshot = await get(ref(db, 'users'));
            if (snapshot.exists()) {
                const allUsers = Object.values(snapshot.val()) as User[];
                // Filter users who have used my referral code
                const myTeam = allUsers.filter(u => 
                    u.referrerId && u.referrerId.toUpperCase() === currentUser.referralCode.toUpperCase()
                );
                setMembers(myTeam);
            }
            setLoading(false);
        };
        fetchTeam();
    }, [currentUser.referralCode]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-2">My Team</h2>
                <div className="flex gap-4 mt-4">
                    <div className="bg-indigo-50 p-4 rounded-2xl flex-1">
                        <p className="text-xs text-indigo-600 font-bold uppercase">Total Direct</p>
                        <p className="text-2xl font-bold text-indigo-900">{members.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl flex-1">
                        <p className="text-xs text-green-600 font-bold uppercase">Active</p>
                        <p className="text-2xl font-bold text-green-900">{members.filter(m => m.isActive).length}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pb-20">
                <h3 className="font-bold text-slate-600 text-sm px-2">Direct Referrals</h3>
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading team...</div>
                ) : members.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400">No team members found yet.</p>
                        <p className="text-xs text-slate-300 mt-1">Share your code to build your team!</p>
                    </div>
                ) : (
                    members.map(member => (
                        <div key={member.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <UserIcon size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${member.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {member.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <Calendar size={10} /> Joined: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
