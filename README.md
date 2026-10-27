# Controle de Utilização de Automóveis

WebAPI em Node.js + Express para controlar os automóveis de uma empresa, seus motoristas e a utilização dos veículos.

## Tecnologias

- [Node.js](https://nodejs.org/) (22.12+ na série 22, 24.x ou >= 26; recomendado: 26, conforme `.nvmrc`)
- [Express 5](https://expressjs.com/) (framework HTTP)
- [TypeScript](https://www.typescriptlang.org/) (tipagem estática)
- [Vitest](https://vitest.dev/) (testes unitários e de integração)
- [Supertest](https://github.com/ladjs/supertest) (testes HTTP ponta a ponta)
- Persistência em memória (sem banco de dados)

## Como executar

```bash
# 1. Selecionar a versão do Node (se utilizar nvm)
nvm use

# 2. Instalar as dependências nas versões do lockfile
npm ci

# 3. Subir a API em modo de desenvolvimento (com reload automático)
npm run dev

# ou compilar e executar a versão de produção
npm run build
npm start
```

A API fica disponível em `http://localhost:3000`. Para usar outra porta, defina a variável de ambiente `PORT`:

```bash
PORT=8080 npm start
```

Verificação rápida:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Como executar os testes

```bash
npm test           # executa todos os testes uma vez
npm run test:watch # executa em modo watch
npm run typecheck  # verifica os tipos TypeScript
```

A suíte cobre as regras de negócio dos três serviços, validação de datas e todos os endpoints HTTP (CRUD, filtros, conflitos de utilização ativa e histórica, finalização e limite do corpo JSON). Os testes de utilização usam um relógio fixo para não depender da data de execução.

## Estrutura do projeto

```
src/
├── app.ts                     # montagem do app Express e injeção de dependências
├── server.ts                  # inicialização do servidor HTTP
├── domain/
│   └── models.ts              # entidades Automobile, Driver e Usage
├── controllers/               # adaptação HTTP (request/response)
├── services/                  # regras de negócio
├── repositories/              # persistência em memória
├── routes/                    # definição das rotas
├── middlewares/               # tratamento centralizado de erros e 404
├── errors/
│   └── http-error.ts          # erro com status HTTP
└── utils/
    └── validation.ts          # validação dos dados de entrada
tests/
├── automobile.service.test.ts # testes de unidade do serviço de automóveis
├── driver.service.test.ts     # testes de unidade do serviço de motoristas
├── usage.service.test.ts      # testes de unidade do serviço de utilizações
├── validation.test.ts         # validação de timestamps, calendário e fusos
├── api.test.ts                # testes de integração dos endpoints
└── test-helpers.ts
```

A aplicação segue uma separação em camadas: **rotas → controllers → services → repositories**. Os controllers apenas traduzem HTTP; as regras de negócio ficam nos services, que dependem de repositórios injetados — o que torna os testes de unidade simples e isolados.

## Modelo de dados

### Automóvel

| Campo  | Tipo   | Obrigatório |
| ------ | ------ | ----------- |
| `id`   | string | gerado pela API (UUID) |
| `plate`| string | sim |
| `color`| string | sim |
| `brand`| string | sim |

### Motorista

| Campo  | Tipo   | Obrigatório |
| ------ | ------ | ----------- |
| `id`   | string | gerado pela API (UUID) |
| `name` | string | sim |

### Utilização do automóvel

| Campo          | Tipo          | Obrigatório |
| -------------- | ------------- | ----------- |
| `id`           | string        | gerado pela API (UUID) |
| `automobileId` | string        | sim |
| `driverId`     | string        | sim |
| `startDate`    | string (ISO 8601) | sim |
| `endDate`      | string (ISO 8601) \| null | preenchido na finalização |
| `reason`       | string        | sim |

## Endpoints

### Automóveis

| Método | Rota                | Descrição                                   |
| ------ | ------------------- | ------------------------------------------- |
| POST   | `/automobiles`      | Cadastra um automóvel                       |
| GET    | `/automobiles`      | Lista automóveis (filtro `?brand=`)         |
| GET    | `/automobiles/:id`  | Recupera um automóvel pelo identificador    |
| PUT    | `/automobiles/:id`  | Atualiza um automóvel (campos parciais)     |
| DELETE | `/automobiles/:id`  | Exclui um automóvel                         |

### Motoristas

| Método | Rota             | Descrição                                  |
| ------ | ---------------- | ------------------------------------------ |
| POST   | `/drivers`       | Cadastra um motorista                      |
| GET    | `/drivers`       | Lista motoristas (filtro `?name=`)         |
| GET    | `/drivers/:id`   | Recupera um motorista pelo identificador   |
| PUT    | `/drivers/:id`   | Atualiza um motorista (campos parciais)    |
| DELETE | `/drivers/:id`   | Exclui um motorista                        |

### Utilizações

| Método | Rota                     | Descrição                                              |
| ------ | ------------------------ | ------------------------------------------------------ |
| POST   | `/usages`                | Registra o início de uma utilização                    |
| GET    | `/usages`                | Lista utilizações com dados do motorista e automóvel   |
| PATCH  | `/usages/:id/finish`     | Finaliza a utilização, gravando a data de término      |

## Exemplos de uso

### Cadastrar automóvel

```bash
curl -X POST http://localhost:3000/automobiles \
  -H 'Content-Type: application/json' \
  -d '{"plate": "ABC1D23", "color": "Prata", "brand": "Volkswagen"}'
```

```json
{
  "id": "ac531439-ecbf-4e64-a5a8-3eefb22dba9f",
  "plate": "ABC1D23",
  "color": "Prata",
  "brand": "Volkswagen"
}
```

A placa é normalizada para maiúsculas e não pode ser duplicada.

### Listar automóveis filtrando por marca

```bash
curl 'http://localhost:3000/automobiles?brand=volks'
```

O filtro é parcial e não diferencia maiúsculas de minúsculas. O mesmo vale para o filtro `?name=` em `/drivers`.

### Cadastrar motorista

```bash
curl -X POST http://localhost:3000/drivers \
  -H 'Content-Type: application/json' \
  -d '{"name": "Maria Silva"}'
```

### Registrar utilização

```bash
curl -X POST http://localhost:3000/usages \
  -H 'Content-Type: application/json' \
  -d '{
    "automobileId": "ac531439-ecbf-4e64-a5a8-3eefb22dba9f",
    "driverId": "235c08fb-4fa4-49df-ada3-202bd94b4cb5",
    "startDate": "2026-01-10T08:00:00.000Z",
    "reason": "Visita ao cliente"
  }'
```

```json
{
  "id": "7b469dc2-f3be-4ff9-a6b7-ea4963c5cb2b",
  "automobile": {
    "id": "ac531439-ecbf-4e64-a5a8-3eefb22dba9f",
    "plate": "ABC1D23",
    "color": "Prata",
    "brand": "Volkswagen"
  },
  "driver": {
    "id": "235c08fb-4fa4-49df-ada3-202bd94b4cb5",
    "name": "Maria Silva"
  },
  "startDate": "2026-01-10T08:00:00.000Z",
  "endDate": null,
  "reason": "Visita ao cliente"
}
```

`startDate` deve conter uma data e hora válidas com segundos e fuso explícito (`Z` ou `±HH:MM`), por exemplo `2026-01-10T08:00:00-03:00`. Frações de segundo de 1 a 3 dígitos são opcionais. A API normaliza a data para UTC e rejeita datas futuras, horários sem fuso e datas inexistentes, como 30 de fevereiro, com **400 Bad Request**. Ajuste a data do exemplo para o início real da utilização.

### Finalizar utilização

```bash
curl -X PATCH http://localhost:3000/usages/7b469dc2-f3be-4ff9-a6b7-ea4963c5cb2b/finish
```

A data de término é gravada com o instante atual e o automóvel/motorista ficam liberados para uma nova utilização.

### Listar utilizações

```bash
curl http://localhost:3000/usages
```

Retorna as utilizações da mais recente para a mais antiga, com o nome do motorista e os dados do automóvel utilizado.

## Regras de negócio

- Um automóvel só pode ser utilizado por um motorista por vez. Uma nova utilização para um automóvel com utilização em aberto retorna **409 Conflict**.
- Um motorista que já está utilizando um automóvel não pode utilizar outro ao mesmo tempo. Também retorna **409 Conflict**.
- Uma nova utilização permanece em aberto até a finalização. Seu início não pode sobrepor períodos anteriores do mesmo automóvel ou motorista, mesmo já finalizados (**409 Conflict**). Pode começar exatamente no instante em que a utilização anterior terminou.
- A data de início não pode estar no futuro (**400 Bad Request**). A finalização não pode ocorrer antes do início (**409 Conflict**, inclusive em caso de retrocesso do relógio do servidor).
- Finalizar uma utilização já finalizada retorna **409 Conflict**.
- Um automóvel ou motorista referenciado por registros de utilização não pode ser excluído (**409 Conflict**), preservando o histórico.
- A placa do automóvel é única e armazenada em maiúsculas.
- Os dados são mantidos em memória: reiniciar a aplicação limpa a base.

## Formato de erro

Todos os erros seguem o mesmo formato:

```json
{ "error": "Automobile not found." }
```

| Status | Situação                                                     |
| ------ | ------------------------------------------------------------ |
| 400    | Dados inválidos ou ausentes, JSON malformado                 |
| 404    | Recurso ou rota não encontrada                               |
| 409    | Conflito com uma regra de negócio                            |
| 413    | Corpo JSON maior que 100 KB (102.400 bytes)                   |
| 500    | Erro inesperado                                              |
