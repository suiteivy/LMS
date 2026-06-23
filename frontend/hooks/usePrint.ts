import { Platform } from 'react-native';
import * as Print from 'expo-print';

export function usePrint() {
  const printAsync = async ({ uri }: { uri: string }) => {
    if (Platform.OS === 'web') {
      // Web: open print dialog with the PDF
      const printWindow = window.open(uri, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      // Native: use expo-print to print the file
      await Print.printAsync({ uri });
    }
  };

  const printHtml = async (html: string) => {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Print.printAsync({ uri });
    }
  };

  return { printAsync, printHtml };
}
