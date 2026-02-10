"use client";

export function BorrowButton({ bookId }: { bookId: string }) {
  const handleBorrow = async () => {
    try {
      await fetch('/api/library/borrow', {
        method: 'POST',
        body: JSON.stringify({ bookId }),
      });
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
