/**
 * Crisis hotline data sourced and adapted from:
 * https://github.com/sashabaranov/suicide-hotlines
 * Licensed under Apache License 2.0
 */

export interface CrisisResource {
  phone: string[];
  website?: string;
  email?: string;
  description?: string;
}

export interface CrisisResources {
  [countryCode: string]: CrisisResource;
}

export const CRISIS_RESOURCES: CrisisResources = {
  "US": {
    phone: ["988", "1-800-273-8255"],
    website: "https://988lifeline.org/",
    description: "988 Suicide & Crisis Lifeline - 24/7 free and confidential support"
  },
  "GB": {
    phone: ["116 123"],
    email: "jo@samaritans.org",
    website: "https://www.samaritans.org",
    description: "Samaritans - 24/7 listening and support service"
  },
  "CA": {
    phone: ["1-833-456-4566", "45645 (Text)"],
    website: "https://www.crisisservicescanada.ca/",
    description: "Canada Suicide Prevention Service - 24/7 support in English and French"
  },
  "AU": {
    phone: ["13 11 14"],
    website: "https://www.lifeline.org.au/",
    description: "Lifeline Australia - 24/7 crisis support and suicide prevention"
  },
  "NZ": {
    phone: ["1737", "0800 543 354"],
    website: "https://1737.org.nz",
    description: "Need to talk? 1737 - Free call or text 24/7"
  },
  "IN": {
    phone: ["91529 87821"],
    website: "https://www.aasra.info/",
    description: "AASRA - 24/7 helpline for emotional support and crisis intervention"
  },
  "DEFAULT": {
    phone: ["988", "1-800-273-8255"],
    website: "https://988lifeline.org/",
    description: "International Crisis Support - 24/7 support available"
  }
};

export async function getLocationBasedResources(ipAddress?: string): Promise<CrisisResource> {
  if (!ipAddress) {
    console.log('No IP provided, using default resources');
    return CRISIS_RESOURCES.DEFAULT;
  }
  
  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
    const data = await response.json();
    
    // Log just the country detection
    console.log('Country Detection:', {
      country: data.country,
      countryCode: data.countryCode
    });
    
    // Get resources for the detected country code, fallback to DEFAULT if not found
    const resources = CRISIS_RESOURCES[data.countryCode] || CRISIS_RESOURCES.DEFAULT;
    
    // Log which resources we're using
    console.log('Using resources for:', data.countryCode || 'DEFAULT');
    
    return resources;
  } catch (error) {
    console.error('Error getting country from IP:', error);
    return CRISIS_RESOURCES.DEFAULT;
  }
} 