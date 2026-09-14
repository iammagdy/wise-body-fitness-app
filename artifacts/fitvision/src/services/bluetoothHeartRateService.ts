// Ambient Bluetooth Web API types for TypeScript
type BluetoothDevice = any;
type BluetoothRemoteGATTServer = any;
type BluetoothRemoteGATTCharacteristic = any;

import type { HeartRateData, HeartRateZone } from "../types/workout";

type HRCallback = (data: HeartRateData) => void;

class BluetoothHeartRateService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private listeners: Set<HRCallback> = new Set();
  private currentData: HeartRateData = {
    bpm: 0,
    connected: false,
    zone: "warmup",
  };

  public isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  public subscribe(cb: HRCallback): () => void {
    this.listeners.add(cb);
    cb(this.currentData);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.currentData);
    }
  }

  public calculateZone(bpm: number): HeartRateZone {
    if (bpm <= 0) return "warmup";
    if (bpm < 110) return "warmup";
    if (bpm < 135) return "fat_burn";
    if (bpm < 165) return "cardio";
    return "peak";
  }

  public async connect(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      // Request standard BLE Heart Rate Service (0x180D)
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });

      if (!this.device || !this.device.gatt) return false;

      this.device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService("heart_rate");
      this.characteristic = await service.getCharacteristic("heart_rate_measurement");

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (!target.value) return;
        this.parseHeartRate(target.value);
      });

      this.currentData = {
        bpm: 72,
        connected: true,
        deviceName: this.device.name || "HR Monitor",
        zone: "warmup",
      };
      this.notify();
      return true;
    } catch (err) {
      console.warn("Bluetooth HR connect error or cancelled:", err);
      return false;
    }
  }

  public disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  private handleDisconnect() {
    this.currentData = {
      bpm: 0,
      connected: false,
      deviceName: undefined,
      zone: "warmup",
    };
    this.notify();
  }

  private parseHeartRate(value: DataView) {
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    let bpm = 0;
    if (rate16Bits) {
      bpm = value.getUint16(1, true); // Little endian
    } else {
      bpm = value.getUint8(1);
    }

    if (bpm > 30 && bpm < 250) {
      this.currentData = {
        bpm,
        connected: true,
        deviceName: this.device?.name || "HR Monitor",
        zone: this.calculateZone(bpm),
      };
      this.notify();
    }
  }

  public getData(): HeartRateData {
    return this.currentData;
  }
}

export const bluetoothHR = new BluetoothHeartRateService();
