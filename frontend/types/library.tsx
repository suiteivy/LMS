export interface BorrowRecord {
  bookId: string;
  title: string;
  borrowDate: Date;
  dueDate: Date;
  returned: boolean;
}