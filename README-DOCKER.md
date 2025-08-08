# Docker Setup para MongoDB

## Como rodar o MongoDB

1. **Subir os containers**:
```bash
docker-compose up -d
```

2. **Verificar se está rodando**:
```bash
docker ps
```

Você deve ver dois containers:
- `lmk-mongodb` (MongoDB na porta 27018)
- `lmk-mongo-express` (Interface web na porta 8082)

3. **Acessar MongoDB Express**:
Abra http://localhost:8082 no navegador para gerenciar o banco

4. **Parar os containers**:
```bash
docker-compose down
```

## Configuração

- **MongoDB**: localhost:27019
- **MongoDB Express**: localhost:8082
- **Usuário**: admin
- **Senha**: password123
- **Database**: lmk

## String de Conexão

```
mongodb://admin:password123@localhost:27019/lmk?authSource=admin
```

## Logs do MongoDB

```bash
docker logs lmk-mongodb
```