'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { Icons } from '../../components/Icons';

export default function Dashboard() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('invoices')
            .select('no, customer, updated_at, content')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
        } else if (data) {
            setDocuments(data);
        }
        setLoading(false);
    };

    const deleteDocument = async (no) => {
        if (confirm('Are you sure you want to delete this document?')) {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('no', no);

            if (error) {
                console.error('Error deleting document:', error);
            } else {
                setDocuments(prev => prev.filter(doc => doc.no !== no));
            }
        }
    };

    const filteredDocs = documents.filter(doc =>
        (doc.no?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.customer?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-slate-700">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded flex items-center justify-center text-white shadow-md">
                            <Icons.Logo className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">Sheet Worker Tools</h1>
                    </div>

                    <div className="flex-1 max-w-2xl mx-8 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search documents..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs ring-2 ring-white">U</div>
                    </div>
                </div>
            </header>

            {/* NEW DOCUMENT SECTION */}
            <section className="bg-white border-b border-gray-200 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Start a new document</p>
                    <div className="flex gap-8">
                        <Link href="/" className="group flex flex-col items-center gap-3">
                            <div className="w-36 h-48 bg-white border border-gray-200 rounded-md shadow-sm group-hover:border-emerald-500 group-hover:ring-2 group-hover:ring-emerald-100 transition flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50"></div>
                                <svg className="w-12 h-12 text-emerald-500 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-slate-700">Blank Document</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* RECENT DOCUMENTS */}
            <main className="flex-1 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-slate-800">Recent documents</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <span>Date Created</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p>Fetching your documents...</p>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-gray-200 rounded-xl text-slate-400">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="font-medium">No documents found</p>
                            <p className="text-sm">Create your first document to get started</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                            {filteredDocs.map((doc) => (
                                <div key={doc.no} className="group flex flex-col gap-3">
                                    <Link
                                        href={`/?data=${encodeURIComponent(JSON.stringify(doc.content))}`}
                                        className="w-full aspect-[3/4] bg-white border border-gray-200 rounded-md shadow-sm group-hover:border-emerald-500 group-hover:ring-2 group-hover:ring-emerald-100 transition relative overflow-hidden p-4"
                                    >
                                        <div className="absolute inset-0 bg-white z-0"></div>
                                        {/* DOC PREVIEW (SYMBOLIC) */}
                                        <div className="relative z-10 w-full h-full flex flex-col gap-2 opacity-30 select-none overflow-hidden">
                                            <div className="h-2 w-3/4 bg-gray-200 rounded"></div>
                                            <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                                            <div className="mt-4 space-y-2">
                                                <div className="h-1 w-full bg-gray-100 rounded"></div>
                                                <div className="h-1 w-full bg-gray-100 rounded"></div>
                                                <div className="h-1 w-5/6 bg-gray-100 rounded"></div>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between">
                                            <Link
                                                href={`/?data=${encodeURIComponent(JSON.stringify(doc.content))}`}
                                                className="text-sm font-semibold text-slate-800 truncate pr-2 hover:text-emerald-600 transition"
                                            >
                                                {doc.no || 'Untitled'}
                                            </Link>
                                            <button
                                                onClick={() => deleteDocument(doc.no)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                            <Icons.Pdf className="w-3 h-3 text-emerald-500" />
                                            <span>Opened {new Date(doc.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Last Modified</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredDocs.map((doc) => (
                                        <tr key={doc.no} className="hover:bg-gray-50 transition group">
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/?data=${encodeURIComponent(JSON.stringify(doc.content))}`}
                                                    className="flex items-center gap-3"
                                                >
                                                    <div className="p-2 bg-emerald-50 rounded text-emerald-600">
                                                        <Icons.Logo className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-800">{doc.no}</span>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{doc.customer || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{new Date(doc.updated_at).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/?data=${encodeURIComponent(JSON.stringify(doc.content))}`}
                                                        className="p-2 text-gray-400 hover:text-emerald-600 transition"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => deleteDocument(doc.no)}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <footer className="py-10 bg-white border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-400">
                    © 2026 Sheet Worker Tools. All rights reserved. Built for professional productivity.
                </div>
            </footer>
        </div>
    );
}
