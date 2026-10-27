export interface Automobile {
  id: string;
  plate: string;
  color: string;
  brand: string;
}

export interface Driver {
  id: string;
  name: string;
}

export interface Usage {
  id: string;
  automobileId: string;
  driverId: string;
  startDate: string;
  endDate: string | null;
  reason: string;
}

export interface UsageDetails {
  id: string;
  automobile: Automobile;
  driver: Driver;
  startDate: string;
  endDate: string | null;
  reason: string;
}
