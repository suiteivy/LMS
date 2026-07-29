"use client";

import { LibraryAPI } from "@/services/LibraryService";

export function BorrowButton({ bookId }: { bookId: string }) {
  const handleBorrow = async () => {
    try {
      await LibraryAPI.borrowBook(bookId);
      alert('Book borrowed successfully!');
    } catch (error) {
      alert('Failed to borrow book');
    }
  };

  return (
    <button onClick={handleBorrow} className="btn btn-primary btn-sm">
      Borrow
    </button>
  );
}

