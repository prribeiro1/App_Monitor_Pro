import { dbService } from './db';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const backupRepository = {
    // Gera o arquivo para download local (Android/Browser)
    exportDataLocal: async (): Promise<Blob> => {
        try {
            const data = await dbService.exportAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Tenta forçar download via Link (funciona na maioria dos browsers, mas no Android WebView pode exigir permissão)
            const fileName = `backup_escolar_${new Date().toISOString().split('T')[0]}.json`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return blob;
        } catch (error) {
            console.error('Erro ao gerar backup local:', error);
            throw error;
        }
    },

    // Compartilhar arquivo nativamente (Melhor para Android/Mobile)
    shareDataLocal: async (): Promise<void> => {
        try {
            const data = await dbService.exportAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const fileName = `backup_escolar_${new Date().toISOString().split('T')[0]}.json`;

            if (Capacitor.isNativePlatform()) {
                // Lógica Nativa (Android/iOS)
                try {
                    // 1. Salvar arquivo no Cache
                    const result = await Filesystem.writeFile({
                        path: fileName,
                        data: jsonString,
                        directory: Directory.Cache,
                        encoding: Encoding.UTF8
                    });

                    // 2. Compartilhar o arquivo
                    await Share.share({
                        title: 'Backup Monitor Escolar',
                        text: 'Backup dos dados do Monitor Escolar Pro',
                        url: result.uri,
                        dialogTitle: 'Salvar Backup'
                    });
                } catch (nativeError) {
                    console.error("Erro nativo no share:", nativeError);
                    alert("Erro ao compartilhar nativamente: " + JSON.stringify(nativeError));
                }
            } else {
                // Lógica Web (Browser)
                const file = new File([jsonString], fileName, { type: 'application/json' });
                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Backup Monitor Escolar',
                        text: 'Backup dos dados do Monitor Escolar Pro',
                        files: [file]
                    });
                } else {
                    // Fallback para download normal
                    await backupRepository.exportDataLocal();
                }
            }
        } catch (error) {
            console.error('Erro ao compartilhar backup:', error);
            // Se der erro no share (ex: cancelado), tenta download normal
            await backupRepository.exportDataLocal();
        }
    },

    // Importar Dados (Restaurar Backup)
    importData: async (jsonString: string): Promise<void> => {
        try {
            const data = JSON.parse(jsonString);

            // Validação básica
            if (!data.routes || !data.students || !data.generatedAt) {
                throw new Error("Arquivo de backup inválido ou corrompido.");
            }

            await dbService.importData(data);
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            throw error;
        }
    },

    // Upload REAL para o Google Drive usando a API v3
    uploadToDrive: async (accessToken: string) => {
        console.log('Iniciando upload para o Google Drive...');

        try {
            // 1. Preparar os dados
            const data = await dbService.exportAllData();
            const fileContent = JSON.stringify(data, null, 2);
            const fileName = `backup_escolar_${new Date().toISOString().slice(0, 10)}.json`;

            // 2. Criar o corpo da requisição Multipart (Metadata + Conteúdo)
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                // parents: ['appDataFolder'] // Opcional: Salvar na pasta oculta do app, ou remova para salvar na raiz
            };

            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                fileContent +
                close_delim;

            // 3. Fazer a chamada fetch para a API do Google Drive
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: multipartRequestBody
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro Google Drive: ${errorData.error?.message || response.statusText}`);
            }

            const result = await response.json();
            console.log('Arquivo criado no Drive com ID:', result.id);
            return result;

        } catch (error) {
            console.error('Falha no upload para o Drive:', error);
            throw error;
        }
    }
};