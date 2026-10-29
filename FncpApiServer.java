package br.com.fncp.jirateste;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.Executors;

/** Servidor local somente para consulta. Não modifica o JSON de origem. */
public class FncpApiServer {
    private static final ObjectMapper JSON = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    private static final Path DATA = Path.of(System.getenv().getOrDefault("FNCP_DATA_FILE", "fncp-importacao.json")).toAbsolutePath().normalize();
    private static final Path WEB_DIR =
        Path.of("src/main/resources/static")
                .toAbsolutePath()
                .normalize();

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getenv().getOrDefault("FNCP_PORT", "8081"));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/health", ex -> {
            if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) { respond(ex, 405, Map.of("erro", "Use GET.")); return; }
            respond(ex, 200, Map.of("status", "ok", "service", "FNCP Control API", "readOnly", true));
        });
        server.createContext("/api/fncps", FncpApiServer::handleFncps);
        // Explicitly disable imports in this test build to protect the copied JSON.
        server.createContext("/api/import", ex -> respond(ex, 405, Map.of("erro", "Importação desabilitada nesta versão de teste; os dados são somente leitura.")));
        server.createContext("/", FncpApiServer::handleHome);
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
        System.out.println("FNCP Control Revisado em http://127.0.0.1:" + port);
        System.out.println("Modo: somente leitura");
        System.out.println("Arquivo de dados: " + DATA);
    }

    private static void handleFncps(HttpExchange ex) throws IOException {
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) { respond(ex, 405, Map.of("erro", "Use GET.")); return; }
        if (!Files.isRegularFile(DATA)) { respond(ex, 404, Map.of("erro", "Arquivo de dados não encontrado.", "arquivo", DATA.toString())); return; }
        try {
            JsonNode root = JSON.readTree(DATA.toFile());
            if (root == null || !root.has("fncps") || !root.get("fncps").isArray()) {
                respond(ex, 422, Map.of("erro", "JSON inválido: esperado objeto com lista 'fncps'.")); return;
            }
            respondRaw(ex, 200, JSON.writeValueAsBytes(root));
        } catch (Exception e) {
            respond(ex, 500, Map.of("erro", "Não foi possível ler os dados.", "detalhe", e.getMessage() == null ? "erro" : e.getMessage()));
        }
    }

    
private static void handleHome(HttpExchange ex) throws IOException {
    if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
        respond(ex, 405, Map.of("erro", "Método não permitido."));
        return;
    }

    String requestedPath = ex.getRequestURI().getPath();

    if (requestedPath == null || requestedPath.equals("/")) {
        requestedPath = "/index.html";
    }

    Path file = WEB_DIR.resolve(requestedPath.substring(1))
            .normalize();

    if (!file.startsWith(WEB_DIR)) {
        respond(ex, 403, Map.of("erro", "Acesso negado."));
        return;
    }

    if (!Files.isRegularFile(file)) {
        respond(ex, 404, Map.of(
                "erro", "Arquivo do front-end não encontrado.",
                "arquivo", requestedPath
        ));
        return;
    }

    String lowerPath = requestedPath.toLowerCase(
            java.util.Locale.ROOT
    );

    String contentType;

    if (lowerPath.endsWith(".html")) {
        contentType = "text/html; charset=utf-8";
    } else if (lowerPath.endsWith(".css")) {
        contentType = "text/css; charset=utf-8";
    } else if (lowerPath.endsWith(".js")) {
        contentType = "text/javascript; charset=utf-8";
    } else if (lowerPath.endsWith(".json")) {
        contentType = "application/json; charset=utf-8";
    } else if (lowerPath.endsWith(".svg")) {
        contentType = "image/svg+xml";
    } else {
        contentType = "application/octet-stream";
    }

    byte[] body = Files.readAllBytes(file);

    Headers headers = ex.getResponseHeaders();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "no-store");

    ex.sendResponseHeaders(200, body.length);

    try (var out = ex.getResponseBody()) {
        out.write(body);
    }
}


    private static void respond(HttpExchange ex, int status, Object value) throws IOException {
        respondRaw(ex, status, JSON.writeValueAsBytes(value));
    }

    private static void respondRaw(HttpExchange ex, int status, byte[] body) throws IOException {
        Headers h = ex.getResponseHeaders();
        h.set("Content-Type", "application/json; charset=utf-8");
        h.set("Cache-Control", "no-store");
        h.set("X-Content-Type-Options", "nosniff");
        ex.sendResponseHeaders(status, body.length);
        try (var out = ex.getResponseBody()) { out.write(body); }
    }
}
