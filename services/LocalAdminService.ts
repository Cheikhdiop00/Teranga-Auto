// services/LocalAdminService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AdminStats {
  totalUsers: number;
  totalMechanics: number;
  totalClients: number;
  activeMechanics: number;
  pendingRequests: number;
  completedServices: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface UserStats {
  total: number;
  active: number;
  blocked: number;
  newThisMonth: number;
}

interface ServiceStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  averageRating: number;
}

class LocalAdminService {
  private static instance: LocalAdminService;

  static getInstance(): LocalAdminService {
    if (!LocalAdminService.instance) {
      LocalAdminService.instance = new LocalAdminService();
    }
    return LocalAdminService.instance;
  }

  async getDashboardStats(): Promise<AdminStats> {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 800));

    // Calculer les statistiques à partir des données mockées
    const totalUsers = 25;
    const totalMechanics = 8;
    const totalClients = 17;
    const activeMechanics = 6;
    const pendingRequests = 12;
    const completedServices = 145;
    const totalRevenue = 2850000; // 2.85M FCFA
    const monthlyRevenue = 450000; // 450k FCFA

    return {
      totalUsers,
      totalMechanics,
      totalClients,
      activeMechanics,
      pendingRequests,
      completedServices,
      totalRevenue,
      monthlyRevenue,
    };
  }

  async getUserStats(): Promise<UserStats> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      total: 25,
      active: 22,
      blocked: 3,
      newThisMonth: 5,
    };
  }

  async getServiceStats(): Promise<ServiceStats> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      total: 167,
      pending: 12,
      inProgress: 8,
      completed: 145,
      cancelled: 2,
      averageRating: 4.3,
    };
  }

  async getRevenueData(): Promise<{ month: string; revenue: number }[]> {
    await new Promise(resolve => setTimeout(resolve, 700));

    // Données de revenus des 6 derniers mois
    return [
      { month: 'Juillet', revenue: 320000 },
      { month: 'Août', revenue: 385000 },
      { month: 'Septembre', revenue: 410000 },
      { month: 'Octobre', revenue: 395000 },
      { month: 'Novembre', revenue: 428000 },
      { month: 'Décembre', revenue: 450000 },
    ];
  }

  async getServiceTypeStats(): Promise<{ service: string; count: number; percentage: number }[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return [
      { service: 'Réparation moteur', count: 45, percentage: 27 },
      { service: 'Freins', count: 32, percentage: 19 },
      { service: 'Électricité', count: 28, percentage: 17 },
      { service: 'Climatisation', count: 22, percentage: 13 },
      { service: 'Révision', count: 18, percentage: 11 },
      { service: 'Autres', count: 22, percentage: 13 },
    ];
  }

  async getTopMechanics(): Promise<{ id: string; name: string; rating: number; services: number }[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return [
      { id: '3', name: 'Mamadou Diallo', rating: 4.8, services: 45 },
      { id: '5', name: 'Fatou Ndiaye', rating: 4.7, services: 38 },
      { id: '4', name: 'Ibrahima Sow', rating: 4.5, services: 32 },
      { id: '6', name: 'Amadou Ba', rating: 4.3, services: 28 },
    ];
  }
}

export default LocalAdminService;
export type { AdminStats, UserStats, ServiceStats };
