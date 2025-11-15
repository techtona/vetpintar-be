import { faker } from '@faker-js/faker';

// Note: Locale configuration not critical for test data generation
// Can be configured per-instance if needed

// Custom Indonesian data
export const indonesianData = {
  cities: [
    'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang',
    'Makassar', 'Palembang', 'Tangerang', 'Depok', 'Bekasi',
    'Bogor', 'Yogyakarta', 'Malang', 'Denpasar', 'Batam',
  ],
  provinces: [
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
    'Banten', 'Yogyakarta', 'Bali', 'Sumatera Utara', 'Sumatera Barat',
    'Sumatera Selatan', 'Kalimantan Timur', 'Sulawesi Selatan',
  ],
  clinicNames: [
    'Klinik Hewan Sehat', 'Rumah Sakit Hewan Sentosa', 'Klinik Veteriner Kasih Sayang',
    'Pet Care Indonesia', 'Klinik Hewan Sejahtera', 'Veterinary Clinic Prima',
    'Klinik Hewan Bahagia', 'Animal Hospital Nusantara', 'Klinik Hewan Pintar',
  ],
  streetPrefixes: [
    'Jalan', 'Jl.', 'Gang', 'Gg.', 'Komplek', 'Komp.', 'Perumahan', 'Perum.',
  ],
  streetNames: [
    'Sudirman', 'Thamrin', 'Gatot Subroto', 'Kuningan', 'Rasuna Said',
    'Diponegoro', 'Ahmad Yani', 'Sisingamangaraja', 'Veteran', 'Merdeka',
  ],
};

// Helper functions for Indonesian-specific data
export const fakerID = {
  phone: () => {
    const prefixes = ['08', '021', '022', '024', '031', '061'];
    const prefix = faker.helpers.arrayElement(prefixes);
    const number = faker.string.numeric(prefix === '08' ? 9 : 8);
    return `${prefix}${number}`;
  },

  phoneFormatted: () => {
    const prefixes = ['08', '021', '022', '024', '031', '061'];
    const prefix = faker.helpers.arrayElement(prefixes);

    if (prefix === '08') {
      return `+62-${prefix.slice(1)}-${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
    }
    return `+62-${prefix}-${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
  },

  city: () => faker.helpers.arrayElement(indonesianData.cities),

  province: () => faker.helpers.arrayElement(indonesianData.provinces),

  postalCode: () => faker.string.numeric(5),

  address: () => {
    const prefix = faker.helpers.arrayElement(indonesianData.streetPrefixes);
    const street = faker.helpers.arrayElement(indonesianData.streetNames);
    const number = faker.number.int({ min: 1, max: 999 });
    return `${prefix} ${street} No. ${number}`;
  },

  fullAddress: () => {
    const address = fakerID.address();
    const city = fakerID.city();
    const province = fakerID.province();
    const postalCode = fakerID.postalCode();
    return `${address}, ${city}, ${province} ${postalCode}`;
  },

  clinicName: () => faker.helpers.arrayElement(indonesianData.clinicNames),

  email: (name?: string) => {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'email.com'];
    const domain = faker.helpers.arrayElement(domains);

    if (name) {
      const cleanName = name.toLowerCase().replace(/\s+/g, '.');
      return `${cleanName}@${domain}`;
    }

    return faker.internet.email();
  },
};

export { faker };
export default faker;
