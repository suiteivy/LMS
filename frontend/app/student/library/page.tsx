'use client';
import { useState } from 'react';

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
