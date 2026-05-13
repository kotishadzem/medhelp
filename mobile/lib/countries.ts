export type Country = {
  code: string;
  dial: string;
  flag: string;
  name: string;
  aliases?: string[];
};

export const COUNTRIES: Country[] = [
  { code: "GE", dial: "+995", flag: "🇬🇪", name: "საქართველო", aliases: ["Georgia"] },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Deutschland", aliases: ["Germany"] },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom", aliases: ["UK", "Britain", "England"] },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States", aliases: ["USA", "America"] },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italia", aliases: ["Italy"] },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "España", aliases: ["Spain"] },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Nederland", aliases: ["Netherlands"] },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgique", aliases: ["Belgium"] },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Schweiz", aliases: ["Switzerland"] },
  { code: "AT", dial: "+43", flag: "🇦🇹", name: "Österreich", aliases: ["Austria"] },
  { code: "PL", dial: "+48", flag: "🇵🇱", name: "Polska", aliases: ["Poland"] },
  { code: "CZ", dial: "+420", flag: "🇨🇿", name: "Česko", aliases: ["Czech Republic", "Czechia"] },
  { code: "SK", dial: "+421", flag: "🇸🇰", name: "Slovensko", aliases: ["Slovakia"] },
  { code: "HU", dial: "+36", flag: "🇭🇺", name: "Magyarország", aliases: ["Hungary"] },
  { code: "RO", dial: "+40", flag: "🇷🇴", name: "România", aliases: ["Romania"] },
  { code: "BG", dial: "+359", flag: "🇧🇬", name: "България", aliases: ["Bulgaria"] },
  { code: "GR", dial: "+30", flag: "🇬🇷", name: "Ελλάδα", aliases: ["Greece"] },
  { code: "TR", dial: "+90", flag: "🇹🇷", name: "Türkiye", aliases: ["Turkey"] },
  { code: "RU", dial: "+7", flag: "🇷🇺", name: "Россия", aliases: ["Russia"] },
  { code: "UA", dial: "+380", flag: "🇺🇦", name: "Україна", aliases: ["Ukraine"] },
  { code: "BY", dial: "+375", flag: "🇧🇾", name: "Беларусь", aliases: ["Belarus"] },
  { code: "AM", dial: "+374", flag: "🇦🇲", name: "Հայաստան", aliases: ["Armenia"] },
  { code: "AZ", dial: "+994", flag: "🇦🇿", name: "Azərbaycan", aliases: ["Azerbaijan"] },
  { code: "KZ", dial: "+7", flag: "🇰🇿", name: "Қазақстан", aliases: ["Kazakhstan"] },
  { code: "UZ", dial: "+998", flag: "🇺🇿", name: "O‘zbekiston", aliases: ["Uzbekistan"] },
  { code: "IL", dial: "+972", flag: "🇮🇱", name: "ישראל", aliases: ["Israel"] },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "الإمارات", aliases: ["UAE", "Emirates"] },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "السعودية", aliases: ["Saudi Arabia"] },
  { code: "IR", dial: "+98", flag: "🇮🇷", name: "ایران", aliases: ["Iran"] },
  { code: "EG", dial: "+20", flag: "🇪🇬", name: "مصر", aliases: ["Egypt"] },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "المغرب", aliases: ["Morocco"] },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "PK", dial: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "BD", dial: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "CN", dial: "+86", flag: "🇨🇳", name: "中国", aliases: ["China"] },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "日本", aliases: ["Japan"] },
  { code: "KR", dial: "+82", flag: "🇰🇷", name: "대한민국", aliases: ["South Korea", "Korea"] },
  { code: "TH", dial: "+66", flag: "🇹🇭", name: "ประเทศไทย", aliases: ["Thailand"] },
  { code: "VN", dial: "+84", flag: "🇻🇳", name: "Việt Nam", aliases: ["Vietnam"] },
  { code: "PH", dial: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "ID", dial: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "MY", dial: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "NZ", dial: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brasil", aliases: ["Brazil"] },
  { code: "AR", dial: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "MX", dial: "+52", flag: "🇲🇽", name: "México", aliases: ["Mexico"] },
  { code: "CL", dial: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "CO", dial: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "PE", dial: "+51", flag: "🇵🇪", name: "Perú", aliases: ["Peru"] },
  { code: "SE", dial: "+46", flag: "🇸🇪", name: "Sverige", aliases: ["Sweden"] },
  { code: "NO", dial: "+47", flag: "🇳🇴", name: "Norge", aliases: ["Norway"] },
  { code: "DK", dial: "+45", flag: "🇩🇰", name: "Danmark", aliases: ["Denmark"] },
  { code: "FI", dial: "+358", flag: "🇫🇮", name: "Suomi", aliases: ["Finland"] },
  { code: "IE", dial: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "IS", dial: "+354", flag: "🇮🇸", name: "Ísland", aliases: ["Iceland"] },
  { code: "LT", dial: "+370", flag: "🇱🇹", name: "Lietuva", aliases: ["Lithuania"] },
  { code: "LV", dial: "+371", flag: "🇱🇻", name: "Latvija", aliases: ["Latvia"] },
  { code: "EE", dial: "+372", flag: "🇪🇪", name: "Eesti", aliases: ["Estonia"] },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function findCountryByDial(dial: string): Country | undefined {
  return COUNTRIES.find((c) => c.dial === dial);
}
