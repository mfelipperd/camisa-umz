export function useSabbathMode() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const hour = now.getHours();

    // Friday (5) after 18:00 OR Saturday (6) before 18:00
    const isSabbath = (day === 5 && hour >= 18) || (day === 6 && hour < 18);

    return isSabbath;
}
