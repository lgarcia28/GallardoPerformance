import type { NewAppointment, NewRepair, NewVehicle } from "./schema";
import { addDaysToDate, getTodayISO } from "../lib/workshop";

export interface SeedRepairTemplate extends Omit<NewRepair, "id" | "vehicleId"> {
  vehicleIndex: number;
}

export interface SeedAppointmentTemplate
  extends Omit<NewAppointment, "id" | "vehicleId"> {
  vehicleIndex: number | null;
}

export function getInitialSeedPayload(): {
  vehicles: Array<Omit<NewVehicle, "id">>;
  repairs: SeedRepairTemplate[];
  appointments: SeedAppointmentTemplate[];
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
      ownerPhone: "+54 9 341 543-8810",
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
      ownerPhone: "+54 9 341 621-3349",
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
      ownerPhone: "+54 9 341 498-7123",
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
      ownerPhone: "+54 9 341 334-9055",
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
      ownerPhone: "+54 9 341 587-2201",
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
      ownerPhone: "+54 9 341 412-6690",
      notes: "Auto en excelente estado. Usa aceite Dexos1 Gen 3.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const repairs: SeedRepairTemplate[] = [
    // 0: VW Golf GTI — OVERDUE oil change (12 days overdue) + recent diagnostic this month
    {
      vehicleIndex: 0,
      serviceDate: addDaysToDate(today, -5),
      mileageAtService: 74800,
      serviceType: "Diagnóstico electrónico",
      description:
        "Escaneo VCDS por testigo de sensor ABS delantero derecho, reemplazo de sensor Bosch y borrado de fallas.",
      cost: 125000,
      partsCost: 52000,
      mechanicNotes: "Se le recordó que le corresponde cambio de aceite anual.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 0,
      serviceDate: addDaysToDate(today, -377),
      mileageAtService: 65200,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite sintético Motul 8100 X-cess 5W-40 (5.5L), filtro de aceite Mann, filtro de aire y filtro de habitáculo.",
      cost: 168000,
      partsCost: 89000,
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
      partsCost: 98000,
      mechanicNotes: "Discos traseros todavía con 60% de vida útil.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 1: Ford Ranger XLT — OVERDUE oil change (4 days overdue) + recent cooling job this month
    {
      vehicleIndex: 1,
      serviceDate: addDaysToDate(today, -9),
      mileageAtService: 138400,
      serviceType: "Refrigeración / Radiador",
      description:
        "Reemplazo de manguera superior de radiador, termostato original Motorcraft y carga de líquido refrigerante orgánico.",
      cost: 195000,
      partsCost: 84000,
      mechanicNotes: "Circuito purgado y probado a temperatura de trabajo.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 1,
      serviceDate: addDaysToDate(today, -369),
      mileageAtService: 128000,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Elaion F50E 5W-30 (9.5L), filtro de aceite, filtro de gasoil doble etapa y filtro de aire reforzado.",
      cost: 245000,
      partsCost: 132000,
      mechanicNotes: "Se revisó nivel de diferencial y caja de transferencia: OK.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, -4),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 1,
      serviceDate: addDaysToDate(today, -45),
      mileageAtService: 136200,
      serviceType: "Tren delantero",
      description:
        "Reemplazo de ambos extremos de dirección, rótulas inferiores y bujes de barra estabilizadora. Alineación incluida.",
      cost: 310000,
      partsCost: 145000,
      mechanicNotes:
        "Desapareció el golpe en empedrado. Cubiertas con desgaste parejo.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 2: Toyota Corolla Cross — UPCOMING oil change (due in 8 days) + recent alignment this month
    {
      vehicleIndex: 2,
      serviceDate: addDaysToDate(today, -3),
      mileageAtService: 42300,
      serviceType: "Alineación y balanceo",
      description:
        "Rotación de 4 neumáticos, balanceo computarizado y alineación 3D completa.",
      cost: 78000,
      partsCost: 12000,
      mechanicNotes: "Presión calibrada en 33 PSI. Cubiertas parejas.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 2,
      serviceDate: addDaysToDate(today, -357),
      mileageAtService: 32500,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Toyota 0W-20 sintético, filtro de aceite original, filtro de aire y desinfección de conductos A/A.",
      cost: 159000,
      partsCost: 82000,
      mechanicNotes: "Escobillas limpiaparabrisas nuevas instaladas.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, 8),
      reminderStatus: "pending",
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
      partsCost: 78000,
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
      serviceDate: addDaysToDate(today, -40),
      mileageAtService: 60400,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite Honda 0W-20 sintético, filtro de aceite y filtro de aire.",
      cost: 152000,
      partsCost: 79000,
      mechanicNotes: "Todo en orden, turbo sin transpiraciones.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, 325),
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
      partsCost: 98000,
      mechanicNotes: "Se reseteó aviso de inspección en tablero.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, -2),
      reminderStatus: "notified",
      notifiedAt: twoDaysAgoIso,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 4,
      serviceDate: addDaysToDate(today, -35),
      mileageAtService: 95100,
      serviceType: "Distribución",
      description:
        "Kit de distribución completo INA (correa, tensores) + bomba de agua + refrigerante G13 original.",
      cost: 485000,
      partsCost: 235000,
      mechanicNotes: "Trabajo garantizado por 60.000 km o 4 años.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },

    // 5: Chevrolet Cruze RS — UP TO DATE (recent repair this month!)
    {
      vehicleIndex: 5,
      serviceDate: addDaysToDate(today, -12),
      mileageAtService: 28600,
      serviceType: "Cambio de aceite y filtros",
      description:
        "Aceite ACDelco Dexos1 Gen 3 5W-30 sintético, filtro de aceite original GM y filtro de aire.",
      cost: 148000,
      partsCost: 74000,
      mechanicNotes: "Vehículo impecable. Próximo service al año o 38.600 km.",
      reminderPreset: "1_year",
      reminderDueDate: addDaysToDate(today, 353),
      reminderStatus: "pending",
      notifiedAt: null,
      createdAt: nowIso,
    },
    {
      vehicleIndex: 5,
      serviceDate: addDaysToDate(today, -75),
      mileageAtService: 25400,
      serviceType: "Batería / Electricidad",
      description:
        "Reemplazo de batería Moura 12x65 AGM Start-Stop y control de carga de alternador.",
      cost: 220000,
      partsCost: 148000,
      mechanicNotes: "Alternador cargando estable en 14.2V.",
      reminderPreset: "none",
      reminderDueDate: null,
      reminderStatus: "none",
      notifiedAt: null,
      createdAt: nowIso,
    },
  ];

  const appointments: SeedAppointmentTemplate[] = [
    {
      vehicleIndex: 0,
      appointmentDate: today,
      appointmentTime: "09:00",
      licensePlate: "AD 482 KL",
      vehicleLabel: "Volkswagen Golf GTI",
      ownerName: "Marcos Pérez",
      ownerPhone: "+54 9 341 543-8810",
      serviceType: "Cambio de aceite y filtros",
      notes: "Trae el auto a primera hora, retira a las 16 hs. Usar Motul 8100 5W-40.",
      status: "in_progress",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      vehicleIndex: 2,
      appointmentDate: today,
      appointmentTime: "14:30",
      licensePlate: "AF 209 MN",
      vehicleLabel: "Toyota Corolla Cross SEG",
      ownerName: "Diego Sánchez",
      ownerPhone: "+54 9 341 498-7123",
      serviceType: "Cambio de aceite y filtros",
      notes: "Service anual completo + control de fluidos.",
      status: "scheduled",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      vehicleIndex: 1,
      appointmentDate: addDaysToDate(today, 1),
      appointmentTime: "08:30",
      licensePlate: "AC 915 RT",
      vehicleLabel: "Ford Ranger XLT 4x4",
      ownerName: "Laura Fernández",
      ownerPhone: "+54 9 341 621-3349",
      serviceType: "Cambio de aceite y filtros",
      notes: "Revisar también filtro de gasoil doble etapa.",
      status: "scheduled",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      vehicleIndex: null,
      appointmentDate: addDaysToDate(today, 1),
      appointmentTime: "11:00",
      licensePlate: "AF 812 PQ",
      vehicleLabel: "Peugeot 208 Feline 2022",
      ownerName: "Nicolás Herrera",
      ownerPhone: "+54 9 341 609-4412",
      serviceType: "Diagnóstico electrónico",
      notes: "Cliente nuevo por Instagram. Testigo Check Engine prendido.",
      status: "scheduled",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      vehicleIndex: 3,
      appointmentDate: addDaysToDate(today, 3),
      appointmentTime: "10:00",
      licensePlate: "AE 774 BP",
      vehicleLabel: "Honda Civic Touring",
      ownerName: "Sofía Ramírez",
      ownerPhone: "+54 9 341 334-9055",
      serviceType: "Frenos",
      notes: "Control y posible cambio de pastillas traseras.",
      status: "scheduled",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      vehicleIndex: 4,
      appointmentDate: addDaysToDate(today, 5),
      appointmentTime: "15:00",
      licensePlate: "AB 631 VX",
      vehicleLabel: "Audi A3 Sportback",
      ownerName: "Julián Morales",
      ownerPhone: "+54 9 341 587-2201",
      serviceType: "Cambio de aceite y filtros",
      notes: "Coordinó turno luego del recordatorio por WhatsApp.",
      status: "scheduled",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return { vehicles, repairs, appointments };
}
