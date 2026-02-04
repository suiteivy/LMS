'use client';
import React, { useState } from 'react';
import BookSearchResults from '@/app/BookSearchResults';
import BorrowedBooksList from '@/app/BorrowedBooksList';

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div className="p-4">
      {/* Search Books */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search books..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>

      {/* Borrowed Books */}
      <BorrowedBooksList />
      
      {/* Available Books */}
      <BookSearchResults query={searchQuery} />
    </div>
  );
}