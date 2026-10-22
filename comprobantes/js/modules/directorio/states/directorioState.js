/**
 * @file directorioState.js
 * @description Estado y acciones del directorio de socios.
 */

import { obtenerDirectorioNormalizado } from '../services/directorioService.js';
import { alternarEstadoSocioWA } from '../services/socioEstadoService.js';
import { alternarHerenciaSocio } from '../services/socioHerenciaService.js';
import { prepararEdicionSocio, guardarConfiguracionSocio } from '../services/socioConfigModalService.js';
import {
  apagarTodosLosSocios,
  memorizarSociosVigentes,
  restaurarSociosVigentes,
  eliminarSocioDelDirectorio
} from '../services/directorioAccionesService.js';
import { LISTA_MONEDAS_ACTIVAS, obtenerInfoMonedasMaestra } from '../../../shared/constants/listaMonedasActivas.js';

export function createDirectorioState() {
  return {
    directorio: [],
    socios: [],
    busquedaDirectorio: '',
    socioConfigEdit: null,
    modalConfigSocioAbierto: false,
    listaMonedasActivas: LISTA_MONEDAS_ACTIVAS,
    infoMonedasMaestra: obtenerInfoMonedasMaestra(),

    get directorioFiltrado() {
      if (!this.busquedaDirectorio) return this.directorio;
      const q = this.busquedaDirectorio.toLowerCase();
      return this.directorio.filter(s =>
        (s.nombre && s.nombre.toLowerCase().includes(q)) ||
        (s.socio && String(s.socio).toLowerCase().includes(q))
      );
    },

    async cargarDirectorio() {
      this.directorio = await obtenerDirectorioNormalizado() || [];
    },
    async toggleEstadoSocio(socio) {
      await alternarEstadoSocioWA(socio);
      await this.cargarDirectorio();
    },
    async toggleHerenciaSocio(socio) {
      await alternarHerenciaSocio(socio);
      await this.cargarDirectorio();
    },
    async toggleDashSocio(socio) {
      const borrador = prepararEdicionSocio(socio, this.infoMonedasMaestra);
      borrador.mostrar_dashboard = !borrador.mostrar_dashboard;
      await guardarConfiguracionSocio(borrador);
      await this.cargarDirectorio();
    },
    async apagarTodosSocios() {
      await apagarTodosLosSocios();
      await this.cargarDirectorio();
    },
    async guardarVigentes() {
      await memorizarSociosVigentes();
    },
    async restaurarVigentes() {
      await restaurarSociosVigentes();
      await this.cargarDirectorio();
    },
    crearNuevoSocio() {
      this.socioConfigEdit = prepararEdicionSocio({
        nombre: '',
        rol: 'SOCIO',
        moneda_base: 'USDT',
        saldo_inicial: 0,
        mostrar: { tasas: true, dashboard: true },
        monedas: {}
      }, this.infoMonedasMaestra);
      this.modalConfigSocioAbierto = true;
    },
    async eliminarSocioDirectorio(nombre) {
      if (!await eliminarSocioDelDirectorio(nombre)) return;
      await this.cargarDirectorio();
    },
    abrirConfigSocio(socio) {
      this.socioConfigEdit = prepararEdicionSocio(socio, this.infoMonedasMaestra);
      this.modalConfigSocioAbierto = true;
    },
    async guardarConfigSocioModal() {
      await guardarConfiguracionSocio(this.socioConfigEdit);
      this.modalConfigSocioAbierto = false;
      await this.cargarDirectorio();
    }
  };
}
