# VERSATIL

# Odoo Sales Flow — Node.js JSON-RPC

Cliente Node.js que ejecuta el flujo de ventas completo en Odoo a través de su API JSON-RPC 2.0, controlado desde una CLI interactiva en terminal.

---

## Requisitos

- Node.js v12.20 o superior
- Instancia de Odoo accesible en red
- Usuario con permisos sobre `sale.order`, `stock.picking` y `account.move`

---

## Instalación

```bash
git clone https://github.com/CarlosNorberto/odoo-sales-flow.git
cd odoo-sales-flow
npm install
```

---

## Configuración

Crear un archivo `.env` en la raíz del proyecto:

```env
ODOO_URL=http://localhost:8069
ODOO_DB=nombre_de_tu_base_de_datos
ODOO_USERNAME=admin
ODOO_PASSWORD=tu_contraseña
```

---

## Uso

```bash
node ./app.js
```

Al ejecutarlo aparece un menú interactivo en la terminal:

```
? ¿Qué querés ejecutar?
── Pasos individuales ──────────────
❯ 1. Autenticar
  2. Crear venta
  3. Crear y confirmar venta
  4. Crear, confirmar y validar salida de productos
  5. Crear, confirmar y crear factura
  6. Confirmar factura (Flujo completo)
───────────────────────────────────
     Salir
```

Cada opción ejecuta el flujo acumulado hasta ese paso. La opción 6 corre el flujo completo de principio a fin.

---

## Estructura del proyecto

```
odoo-sales-flow/
├── src/
│   ├── cli.js          ← menú interactivo (inquirer)
│   ├── auth.js         ← autenticación JSON-RPC
│   └── operations.js   ← todas las operaciones de Odoo
├── .env                ← credenciales (no versionar)
├── .env.example
├── package.json
└── README.md
```

---

## Flujo de cada opción

| Opción | Pasos que ejecuta |
|--------|-------------------|
| 1. Autenticar | `authenticate()` → retorna `uid` |
| 2. Crear venta | `createSaleOrder()` → `sale.order` en draft |
| 3. Crear y confirmar venta | + `confirmSaleOrder()` → estado `sale` |
| 4. Validar salida de productos | + `getPickingIdForSale()` + `validateAndCreateBackorderStockPicking()` → estado `done` |
| 5. Crear factura | + `createInvoiceFromSale()` → `account.move` en draft |
| 6. Flujo completo | + `confirmInvoice()` → estado `posted` |

---

## Operaciones disponibles (`operations.js`)

| Función | Modelo Odoo | Método RPC |
|---------|-------------|------------|
| `createSaleOrder()` | `sale.order` | `create` |
| `confirmSaleOrder(saleId)` | `sale.order` | `action_confirm` |
| `getPickingIdForSale(saleId)` | `stock.picking` | `search_read` |
| `validateAndCreateBackorderStockPicking(pickingId)` | `stock.picking` | `button_validate` |
| `createInvoiceFromSale(saleId)` | `sale.order` | `_create_invoices` |
| `confirmInvoice(invoiceId)` | `account.move` | `action_post` |

---

## Manejo de errores

Si ocurre un error técnico durante cualquier operación (fallo de red, credenciales inválidas, error de Odoo), la CLI muestra el mensaje y termina el proceso con `exit code 1`.

Los errores de autenticación se muestran en pantalla y regresan al menú sin interrumpir la sesión.

---

## Dependencias

| Paquete | Uso |
|---------|-----|
| `axios` | Llamadas HTTP al endpoint JSON-RPC |
| `dotenv` | Variables de entorno desde `.env` |
| `inquirer@8` | Menú interactivo en terminal |

```bash
npm install axios dotenv inquirer@8
```

---

## Licencia

MIT © 2026
