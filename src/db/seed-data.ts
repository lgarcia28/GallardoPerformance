import type { NewRepair, NewVehicle } from "./schema";
import { addDaysToDate, getTodayISO } from "../lib/workshop";

export interface SeedRepairTemplate extends Omit<NewRepair, "id" | "vehicleId"> {
  vehicleIndex: number;
}

export function getInitialSeedPayload(): {
  vehicles: Array<Omit<NewVehicle, "id">>;
  repairs: SeedRepairTemplate[];
} {
  const today = getTodayISO();
  const nowIso = new Date().toISOString();
  const twoDaysAgoIso = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  ).toISOString();

  const vehicles: Array<Omit<NewVehicle, "id">> = [
    {
      licensePlate: "AD 482 KL",
      brand: "Volkswagen",
      model: "Golf GTI",
      year: 2019,
      engine: "2.0 TSI",
      currentMileage: 74800,
      ownerName: "Marcos Pérez",
      ownerPhone: "+54 9 11 5432-8810",
      notes: "Cliente habitual. Prefiere aceite sintético Motul 8100 5W-40.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      licensePlate: "AC 915 RT",
      brand: "Ford",
      model: "Ranger XLT 4x4",
      year: 2018,
      engine: "3.2 TDCi",
      currentMileage: 138400,
      ownerName: "Laura Fernández",
      ownerPhone: "+54 9 11 6210-3349",
      notes:
        "Usa la camioneta para ruta y campo. Revisar filtros de gasoil siempre.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      licensePlate: "AF 209 MN",
      brand: "Toyota",
      model: "Corolla Cross SEG",
      year: 2022,
      engine: "2.0 Dynamic Force",
      currentMileage: 42300,
      ownerName: "Diego Sánchez",
      ownerPhone: "+54 9 11 4988-7123",
      notes:
        "Services al día fuera de garantía oficial. Siempre pide turno por la mañana.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      licensePlate: "AE 774 BP",
      brand: "Honda",
      model: "Civic Touring",
      year: 2020,
      engine: "1.5 Turbo",
      currentMileage: 61500,
      ownerName: "Sofía Ramírez",
      ownerPhone: "+54 9 11 3341-9055",
      notes:
        "Quedó pendiente controlar desgaste de discos traseros en la próxima visita.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      licensePlate: "AB 631 VX",
      brand: "Audi",
      model: "A3 Sportback",
      year: 2017,
      engine: "1.4 TFSI",
      currentMileage: 96200,
      ownerName: "Julián Morales",
      ownerPhone: "+54 9 11 5877-2201",
      notes: "Caja S-Tronic controlada a los 85.000 km.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      licensePlate: "AG 118 ZP",
      brand: "Chevrolet",
      model: "Cruze RS",
      year: 2023,
      engine: "1.4 Turbo",
      currentMileage: 28900,
      ownerName: "Valeria Gómez",
      ownerPhone: "+54 9 11 4122-6690",
      notes: "Auto en excelente estado. Usa aceite Dexos1 Gen 3.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const repairs: SeedRepairTemplate[] = [
    // 0: VW Golf GTI — OVERDUE oil change (12 days overdue)
    {
      vehicleIndex: 0,
      serviceDate: addDaysToDate(today, -377),
      mileageAtService: 65200,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite sintético Motul 8100 X-cess 5W-40 (5.5L), filtro de aceite Mann, filtro de aire y filtro de habitáculo.",
      cost: 168000,
      mechanicNotes:
        "Sin pérdidas en cárter ni tapa de válvulas. Próximo service al año o 75.000 km.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, -12),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 0,
      serviceDate: addDaysToDate(today, -190),
      mileageAtService: 71100,
      serviceType: "Frenos",
      description:
        "Cambio de pastillas delanteras Bosch cerámicas + rectificado de discos delanteros y purgado de líquido DOT 4.",
      cost: 215000,
      mechanicNotes: "Discos traseros todavía con 60% de vida útil.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 0,
      serviceDate: addDaysToDate(today, -540),
      mileageAtService: 56400,
      serviceType: "Diagnóstico electrónico",
      description:
        "Escaneo VCDS completo, cambio de 4 bujías NGK Iridium y limpieza de cuerpo de mariposa.",
      cost: 145000,
      mechanicNotes: "Se corrigió leve fallo de encendido en cilindro 3.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 1: Ford Ranger XLT — OVERDUE oil change (4 days overdue)
    {
      vehicleIndex: 1,
      serviceDate: addDaysToDate(today, -369),
      mileageAtService: 128000,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Elaion F50E 5W-30 (9.5L), filtro de aceite, filtro de gasoil doble etapa y filtro de aire reforzado.",
      cost: 245000,
      mechanicNotes: "Se revisó nivel de diferencial y caja de transferencia: OK.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, -4),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 1,
      serviceDate: addDaysToDate(today, -145),
      mileageAtService: 134900,
      serviceType: "Tren delantero",
      description:
        "Reemplazo de ambos extremos de dirección, rótulas inferiores y bujes de barra estabilizadora. Alineación incluida.",
      cost: 310000,
      mechanicNotes:
        "Desapareció el golpe en empedrado. Cubiertas con desgaste parejo.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 2: Toyota Corolla Cross — UPCOMING oil change (due in 8 days)
    {
      vehicleIndex: 2,
      serviceDate: addDaysToDate(today, -357),
      mileageAtService: 32500,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Toyota 0W-20 sintético, filtro de aceite original, filtro de aire y desinfección de conductos A/A.",
      cost: 159000,
      mechanicNotes: "Escobillas limpiaparabrisas nuevas instaladas.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, 8),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 2,
      serviceDate: addDaysToDate(today, -95),
      mileageAtService: 39800,
      serviceType: "Alineación y balanceo",
      description:
        "Rotación de 4 neumáticos, balanceo computarizado y alineación 3D.",
      cost: 68000,
      mechanicNotes: "Presión calibrada en 33 PSI.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 3: Honda Civic Touring — UPCOMING brake inspection (due in 19 days)
    {
      vehicleIndex: 3,
      serviceDate: addDaysToDate(today, -161),
      mileageAtService: 57200,
      serviceType: "Frenos",
      description:
        "Cambio de pastillas delanteras Nissin, limpieza y lubricación de guías de caliper.",
      cost: 175000,
      mechanicNotes:
        "Pastillas traseras al 30%. Agendar control a los 6 meses para no rayar discos.",
      reminderPreset: "6_months",
      reminderDueDate: addDaysToDate(today, 19),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 3,
      serviceDate: addDaysToDate(today, -100),
      mileageAtService: 59400,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Honda 0W-20 sintético, filtro de aceite y filtro de aire.",
      cost: 152000,
      mechanicNotes: "Todo en orden, turbo sin transpiraciones.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, 265),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 4: Audi A3 Sportback — ALREADY NOTIFIED this month
    {
      vehicleIndex: 4,
      serviceDate: addDaysToDate(today, -367),
      mileageAtService: 86500,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Castrol Edge 5W-30 LL (4.5L), filtro de aceite Bosch, filtro de aire y habitáculo con carbón activado.",
      cost: 192000,
      mechanicNotes: "Se reseteó aviso de inspección en tablero.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, -2),
      reminderStatus: "notified",
      notifiedAt: twoDaysAgoIso,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 4,
      serviceDate: addDaysToDate(today, -240),
      mileageAtService: 90100,
      serviceType: "Distribución",
      description:
        "Kit de distribución completo INA (correa, tensores) + bomba de agua + refrigerante G13 original.",
      cost: 485000,
      mechanicNotes: "Trabajo garantizado por 60.000 km o 4 años.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 5: Chevrolet Cruze RS — UP TO DATE
    {
      vehicleIndex: 5,
      serviceDate: addDaysToDate(today, -14),
      mileageAtService: 28600,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite ACDelco Dexos1 Gen 3 5W-30 sintético, filtro de aceite original GM y filtro de aire.",
      cost: 148000,
      mechanicNotes: "Vehículo impecable. Próximo service al año o 38.600 km.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, 351),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 5,
      serviceDate: addDaysToDate(today, -210),
      mileageAtService: 21400,
      serviceType: "Batería / Electricidad",
      description:
        "Reemplazo de batería Moura 12x65 AGM Start-Stop y control de carga de alternador.",
      cost: 220000,
      mechanicNotes: "Alternador cargando estable en 14.2V.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },
  ];

  return { vehicles, repairs };
}
