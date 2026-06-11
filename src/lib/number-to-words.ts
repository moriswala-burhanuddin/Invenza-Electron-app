/**
 * Converts a number to its English word representation.
 * Tailored for Shillings (UGX).
 */
export function numberToWords(num: number): string {
    if (num === 0) return 'Zero Shillings ONLY';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    function convertGroup(n: number): string {
        let res = '';
        if (n >= 100) {
            res += units[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 10 && n < 20) {
            res += teens[n - 10] + ' ';
        } else {
            if (n >= 20) {
                res += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
            }
            if (n > 0) {
                res += units[n] + ' ';
            }
        }
        return res;
    }

    let result = '';
    let scaleIndex = 0;
    let integerPart = Math.floor(num);

    while (integerPart > 0) {
        const group = integerPart % 1000;
        if (group > 0) {
            result = convertGroup(group) + scales[scaleIndex] + ' ' + result;
        }
        integerPart = Math.floor(integerPart / 1000);
        scaleIndex++;
    }

    return result.trim().toLowerCase() + ' shillings only';
}

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
