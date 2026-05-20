import { Listing, DayAvailability, PropertyType } from "../booking-context";

export const PROPERTY_TYPES: PropertyType[] = ["apartment", "house", "villa", "cabin", "studio"];

export const LISTING_TEMPLATES: Omit<Listing, "id" | "index" | "imageSeed">[] = [
  { name: "Oceanfront Villa", location: "Bali, Indonesia", propertyType: "villa", pricePerNight: 185, rating: 4.92, reviewCount: 847, bedrooms: 3, bathrooms: 2, maxGuests: 6, superhost: true, instantBook: true, amenities: ["WiFi", "Pool", "Kitchen", "AC", "Parking", "Patio"], mapX: 310, mapY: 180 },
  { name: "Mountain Retreat", location: "Whistler, Canada", propertyType: "cabin", pricePerNight: 142, rating: 4.87, reviewCount: 312, bedrooms: 2, bathrooms: 1, maxGuests: 4, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Parking", "Hot Tub", "Patio"], mapX: 50, mapY: 60 },
  { name: "Shibuya City Loft", location: "Tokyo, Japan", propertyType: "apartment", pricePerNight: 98, rating: 4.78, reviewCount: 563, bedrooms: 1, bathrooms: 1, maxGuests: 2, superhost: false, instantBook: true, amenities: ["WiFi", "Kitchen", "AC", "Washer", "Workspace", "TV"], mapX: 340, mapY: 100 },
  { name: "Tuscan Farmhouse", location: "Florence, Italy", propertyType: "house", pricePerNight: 210, rating: 4.95, reviewCount: 1204, bedrooms: 4, bathrooms: 3, maxGuests: 8, superhost: true, instantBook: false, amenities: ["WiFi", "Kitchen", "Parking", "Pool", "Patio", "BBQ"], mapX: 205, mapY: 95 },
  { name: "Brooklyn Studio", location: "New York, USA", propertyType: "studio", pricePerNight: 75, rating: 4.62, reviewCount: 189, bedrooms: 0, bathrooms: 1, maxGuests: 2, superhost: false, instantBook: true, amenities: ["WiFi", "AC", "Workspace", "TV"], mapX: 95, mapY: 105 },
  { name: "Beach Bungalow", location: "Tulum, Mexico", propertyType: "cabin", pricePerNight: 165, rating: 4.89, reviewCount: 678, bedrooms: 2, bathrooms: 1, maxGuests: 4, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Pool", "Patio", "AC"], mapX: 75, mapY: 145 },
  { name: "Penthouse Suite", location: "Dubai, UAE", propertyType: "apartment", pricePerNight: 320, rating: 4.91, reviewCount: 412, bedrooms: 3, bathrooms: 2, maxGuests: 6, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Pool", "AC", "Gym", "Parking"], mapX: 240, mapY: 130 },
  { name: "Lakefront Lodge", location: "Queenstown, NZ", propertyType: "house", pricePerNight: 195, rating: 4.88, reviewCount: 534, bedrooms: 3, bathrooms: 2, maxGuests: 6, superhost: true, instantBook: false, amenities: ["WiFi", "Kitchen", "Parking", "Patio", "BBQ", "Hot Tub"], mapX: 370, mapY: 260 },
  { name: "Parisian Flat", location: "Paris, France", propertyType: "apartment", pricePerNight: 130, rating: 4.74, reviewCount: 891, bedrooms: 1, bathrooms: 1, maxGuests: 3, superhost: false, instantBook: true, amenities: ["WiFi", "Kitchen", "Washer", "TV"], mapX: 195, mapY: 88 },
  { name: "Jungle Treehouse", location: "Costa Rica", propertyType: "cabin", pricePerNight: 88, rating: 4.96, reviewCount: 267, bedrooms: 1, bathrooms: 1, maxGuests: 2, superhost: true, instantBook: false, amenities: ["WiFi", "Patio", "Kitchen"], mapX: 70, mapY: 160 },
  { name: "Cave Suite", location: "Santorini, Greece", propertyType: "villa", pricePerNight: 275, rating: 4.93, reviewCount: 723, bedrooms: 2, bathrooms: 2, maxGuests: 4, superhost: true, instantBook: true, amenities: ["WiFi", "Pool", "Kitchen", "AC", "Patio"], mapX: 220, mapY: 105 },
  { name: "Alpine Chalet", location: "Zermatt, Switzerland", propertyType: "cabin", pricePerNight: 225, rating: 4.86, reviewCount: 456, bedrooms: 3, bathrooms: 2, maxGuests: 6, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Parking", "Hot Tub", "Patio"], mapX: 200, mapY: 86 },
  { name: "Colonial Townhouse", location: "Cartagena, Colombia", propertyType: "house", pricePerNight: 112, rating: 4.81, reviewCount: 345, bedrooms: 2, bathrooms: 2, maxGuests: 5, superhost: false, instantBook: true, amenities: ["WiFi", "Kitchen", "AC", "Patio", "Pool"], mapX: 80, mapY: 165 },
  { name: "Glass Cabin", location: "Vik, Iceland", propertyType: "cabin", pricePerNight: 198, rating: 4.97, reviewCount: 189, bedrooms: 1, bathrooms: 1, maxGuests: 2, superhost: true, instantBook: false, amenities: ["WiFi", "Kitchen", "Hot Tub", "Patio"], mapX: 170, mapY: 45 },
  { name: "Riad Courtyard", location: "Marrakech, Morocco", propertyType: "house", pricePerNight: 145, rating: 4.84, reviewCount: 567, bedrooms: 3, bathrooms: 2, maxGuests: 6, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Pool", "AC", "Patio"], mapX: 185, mapY: 120 },
  { name: "Harbour Studio", location: "Sydney, Australia", propertyType: "studio", pricePerNight: 105, rating: 4.71, reviewCount: 234, bedrooms: 0, bathrooms: 1, maxGuests: 2, superhost: false, instantBook: true, amenities: ["WiFi", "AC", "Workspace", "TV", "Gym"], mapX: 360, mapY: 240 },
  { name: "Hilltop Villa", location: "Amalfi, Italy", propertyType: "villa", pricePerNight: 350, rating: 4.94, reviewCount: 612, bedrooms: 4, bathrooms: 3, maxGuests: 8, superhost: true, instantBook: false, amenities: ["WiFi", "Pool", "Kitchen", "AC", "Parking", "Patio", "BBQ"], mapX: 210, mapY: 100 },
  { name: "Kampong House", location: "Singapore", propertyType: "house", pricePerNight: 88, rating: 4.76, reviewCount: 178, bedrooms: 2, bathrooms: 1, maxGuests: 4, superhost: false, instantBook: true, amenities: ["WiFi", "Kitchen", "AC", "Washer", "TV"], mapX: 295, mapY: 175 },
  { name: "Desert Dome", location: "Joshua Tree, USA", propertyType: "cabin", pricePerNight: 155, rating: 4.9, reviewCount: 489, bedrooms: 1, bathrooms: 1, maxGuests: 2, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Patio", "Hot Tub", "AC"], mapX: 45, mapY: 120 },
  { name: "Riverside Flat", location: "London, UK", propertyType: "apartment", pricePerNight: 118, rating: 4.73, reviewCount: 712, bedrooms: 1, bathrooms: 1, maxGuests: 2, superhost: false, instantBook: true, amenities: ["WiFi", "Kitchen", "Washer", "TV", "Workspace"], mapX: 190, mapY: 78 },
  { name: "Bamboo Villa", location: "Ubud, Indonesia", propertyType: "villa", pricePerNight: 125, rating: 4.91, reviewCount: 534, bedrooms: 2, bathrooms: 2, maxGuests: 4, superhost: true, instantBook: true, amenities: ["WiFi", "Pool", "Kitchen", "Patio", "AC"], mapX: 305, mapY: 182 },
  { name: "Ski Lodge", location: "Niseko, Japan", propertyType: "cabin", pricePerNight: 178, rating: 4.85, reviewCount: 367, bedrooms: 3, bathrooms: 2, maxGuests: 7, superhost: true, instantBook: false, amenities: ["WiFi", "Kitchen", "Parking", "Hot Tub", "TV"], mapX: 345, mapY: 80 },
  { name: "Art Deco Apt", location: "Buenos Aires, Argentina", propertyType: "apartment", pricePerNight: 68, rating: 4.79, reviewCount: 234, bedrooms: 1, bathrooms: 1, maxGuests: 3, superhost: false, instantBook: true, amenities: ["WiFi", "Kitchen", "AC", "Workspace", "TV"], mapX: 100, mapY: 240 },
  { name: "Floating House", location: "Amsterdam, Netherlands", propertyType: "house", pricePerNight: 165, rating: 4.82, reviewCount: 423, bedrooms: 2, bathrooms: 1, maxGuests: 4, superhost: true, instantBook: true, amenities: ["WiFi", "Kitchen", "Washer", "TV", "Patio"], mapX: 195, mapY: 76 },
];

export function generateListings(count: number): Listing[] {
  return LISTING_TEMPLATES.slice(0, count).map((t, i) => ({
    ...t,
    id: `listing-${i}`,
    index: i,
    imageSeed: i * 7 + 100,
  }));
}

export function generateMonthDays(year: number, month: number, listing: Listing): DayAvailability[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DayAvailability[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const blocked = (d + listing.index * 3) % 8 === 0;
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      available: !blocked,
      price: Math.round(listing.pricePerNight * (isWeekend ? 1.3 : 1) * (1 + (d % 5) * 0.05)),
      minStay: listing.propertyType === "villa" ? 3 : 2,
    });
  }
  return days;
}
