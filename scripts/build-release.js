const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');


/* ==========================================================================
   CAMINHOS
   ========================================================================== */

const rootDir =
    path.resolve(
        __dirname,
        '..'
    );


const packagePath =
    path.join(
        rootDir,
        'package.json'
    );


const packageLockPath =
    path.join(
        rootDir,
        'package-lock.json'
    );


const lastBuildPath =
    path.join(
        rootDir,
        '.last-build.json'
    );


const latestYmlPath =
    path.join(
        rootDir,
        'release',
        'latest.yml'
    );


/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */

function readJson(
    filePath
) {

    return JSON.parse(
        fs.readFileSync(
            filePath,
            'utf8'
        )
    );

}


function writeJson(
    filePath,
    data
) {

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            2
        ) + '\n',
        'utf8'
    );

}


function isYes(
    value
) {

    const normalized =
        String(
            value || ''
        )
            .trim()
            .toLowerCase();


    return (
        normalized === 's' ||
        normalized === 'sim' ||
        normalized === 'y' ||
        normalized === 'yes'
    );

}


/* ==========================================================================
   VERSÃO
   ========================================================================== */

function isValidVersion(
    version
) {

    return /^\d+\.\d+\.\d+$/.test(
        version
    );

}


function versionParts(
    version
) {

    return version
        .split('.')
        .map(
            value =>
                Number(value)
        );

}


function compareVersions(
    a,
    b
) {

    const aParts =
        versionParts(a);

    const bParts =
        versionParts(b);


    for (
        let index = 0;
        index < 3;
        index++
    ) {

        if (
            aParts[index] >
            bParts[index]
        ) {
            return 1;
        }


        if (
            aParts[index] <
            bParts[index]
        ) {
            return -1;
        }

    }


    return 0;

}


function getNextPatchVersion(
    version
) {

    const [
        major,
        minor,
        patch
    ] =
        versionParts(version);


    return [
        major,
        minor,
        patch + 1
    ].join('.');

}


/* ==========================================================================
   DESCOBRIR ÚLTIMA BUILD
   ========================================================================== */

function getLastBuiltVersion() {

    /*
      Primeiro usamos nosso próprio histórico.
    */
    if (
        fs.existsSync(
            lastBuildPath
        )
    ) {

        try {

            const data =
                readJson(
                    lastBuildPath
                );


            if (
                data.version &&
                isValidVersion(
                    data.version
                )
            ) {

                return data.version;

            }

        } catch {

            // Continua para a próxima tentativa.

        }

    }


    /*
      Se ainda não existir histórico,
      tentamos descobrir pelo latest.yml.
    */
    if (
        fs.existsSync(
            latestYmlPath
        )
    ) {

        try {

            const content =
                fs.readFileSync(
                    latestYmlPath,
                    'utf8'
                );


            const match =
                content.match(
                    /^version:\s*([0-9]+\.[0-9]+\.[0-9]+)/m
                );


            if (
                match
            ) {

                return match[1];

            }

        } catch {

            // Continua normalmente.

        }

    }


    return null;

}


/* ==========================================================================
   TERMINAL
   ========================================================================== */

const rl =
    readline.createInterface({
        input:
            process.stdin,

        output:
            process.stdout
    });


function question(
    message
) {

    return new Promise(
        resolve => {

            rl.question(
                message,
                answer => {

                    resolve(
                        String(
                            answer || ''
                        ).trim()
                    );

                }
            );

        }
    );

}


/* ==========================================================================
   EXECUTA COMANDO
   ========================================================================== */

function runCommand(
    command
) {

    return spawnSync(
        command,
        {
            cwd:
                rootDir,

            stdio:
                'inherit',

            shell:
                true,

            env:
                process.env
        }
    );

}


/* ==========================================================================
   RESTAURA PACKAGE.JSON / PACKAGE-LOCK
   ========================================================================== */

function restoreOriginalFiles(
    originalPackage,
    originalPackageLock
) {

    fs.writeFileSync(
        packagePath,
        originalPackage,
        'utf8'
    );


    if (
        originalPackageLock !== null
    ) {

        fs.writeFileSync(
            packageLockPath,
            originalPackageLock,
            'utf8'
        );

    }

}


/* ==========================================================================
   PROCESSO PRINCIPAL
   ========================================================================== */

async function main() {

    console.log('');
    console.log(
        '==================================================='
    );
    console.log(
        '       SISTEMA OFICINA - NOVA VERSÃO'
    );
    console.log(
        '==================================================='
    );
    console.log('');


    /* ------------------------------------------------------------------------
       GUARDA ARQUIVOS ORIGINAIS
       ------------------------------------------------------------------------ */

    const originalPackage =
        fs.readFileSync(
            packagePath,
            'utf8'
        );


    const hasPackageLock =
        fs.existsSync(
            packageLockPath
        );


    const originalPackageLock =
        hasPackageLock
            ? fs.readFileSync(
                packageLockPath,
                'utf8'
            )
            : null;


    const packageJson =
        JSON.parse(
            originalPackage
        );


    const currentVersion =
        packageJson.version;


    const lastBuiltVersion =
        getLastBuiltVersion();


    /* ------------------------------------------------------------------------
       MOSTRA VERSÕES
       ------------------------------------------------------------------------ */

    console.log(
        `Versão atual do projeto: ${currentVersion}`
    );


    if (
        lastBuiltVersion
    ) {

        console.log(
            `Última versão compilada: ${lastBuiltVersion}`
        );

    } else {

        console.log(
            'Última versão compilada: nenhuma registrada'
        );

    }


    console.log('');


    /* ------------------------------------------------------------------------
       SUGESTÃO DA PRÓXIMA VERSÃO
       ------------------------------------------------------------------------ */

    const baseVersion =
        lastBuiltVersion ||
        currentVersion;


    const suggestedVersion =
        getNextPatchVersion(
            baseVersion
        );


    const answer =
        await question(
            `Nova versão [${suggestedVersion}]: `
        );


    const newVersion =
        answer ||
        suggestedVersion;


    /* ------------------------------------------------------------------------
       VALIDA VERSÃO
       ------------------------------------------------------------------------ */

    if (
        !isValidVersion(
            newVersion
        )
    ) {

        console.error('');
        console.error(
            'Versão inválida.'
        );

        console.error(
            'Use o formato: 1.1.2'
        );

        rl.close();

        process.exit(1);

    }


    if (
        lastBuiltVersion &&
        compareVersions(
            newVersion,
            lastBuiltVersion
        ) <= 0
    ) {

        console.error('');

        console.error(
            `A nova versão precisa ser maior que ${lastBuiltVersion}.`
        );

        rl.close();

        process.exit(1);

    }


    /* ------------------------------------------------------------------------
       PERGUNTA SE DEVE PUBLICAR
       ------------------------------------------------------------------------ */

    console.log('');
    console.log(
        `Nova versão: Sistema Oficina ${newVersion}`
    );
    console.log('');


    const publishAnswer =
        await question(
            'Publicar esta versão no GitHub após compilar? (s/n): '
        );


    const shouldPublish =
        isYes(
            publishAnswer
        );


    /* ------------------------------------------------------------------------
       VALIDA TOKEN ANTES DE COMEÇAR
       ------------------------------------------------------------------------ */

    if (
        shouldPublish &&
        !process.env.GITHUB_RELEASE_TOKEN
    ) {

        console.error('');
        console.error(
            'Token do GitHub não encontrado.'
        );

        console.error('');
        console.error(
            'A variável GITHUB_RELEASE_TOKEN precisa estar configurada.'
        );

        console.error(
            'Abra um novo terminal depois de configurar o token.'
        );

        rl.close();

        process.exit(1);

    }


    console.log('');


    if (
        shouldPublish
    ) {

        console.log(
            `Será compilada e publicada a versão ${newVersion}.`
        );

        console.log(
            `Release esperada: v${newVersion}`
        );

    } else {

        console.log(
            `Será compilada localmente a versão ${newVersion}.`
        );

    }


    console.log('');


    /* ------------------------------------------------------------------------
       CONFIRMAÇÃO FINAL
       ------------------------------------------------------------------------ */

    const confirmation =
        await question(
            'Continuar? (s/n): '
        );


    if (
        !isYes(
            confirmation
        )
    ) {

        console.log('');
        console.log(
            'Operação cancelada.'
        );

        rl.close();

        return;

    }


    rl.close();


    /* ------------------------------------------------------------------------
       ALTERA PACKAGE.JSON
       ------------------------------------------------------------------------ */

    packageJson.version =
        newVersion;


    writeJson(
        packagePath,
        packageJson
    );


    /* ------------------------------------------------------------------------
       ALTERA PACKAGE-LOCK.JSON
       ------------------------------------------------------------------------ */

    if (
        hasPackageLock &&
        originalPackageLock
    ) {

        const packageLock =
            JSON.parse(
                originalPackageLock
            );


        packageLock.version =
            newVersion;


        if (
            packageLock.packages &&
            packageLock.packages['']
        ) {

            packageLock
                .packages['']
                .version =
                newVersion;

        }


        writeJson(
            packageLockPath,
            packageLock
        );

    }


    console.log('');
    console.log(
        `Versão alterada para ${newVersion}.`
    );


    /* ------------------------------------------------------------------------
       ESCOLHE BUILD LOCAL OU BUILD + PUBLICAÇÃO
       ------------------------------------------------------------------------ */

    const command =
        shouldPublish

            ? 'npm run electron:publish:raw'

            : 'npm run electron:build:raw';


    console.log('');


    if (
        shouldPublish
    ) {

        console.log(
            'Compilando e publicando no GitHub...'
        );

    } else {

        console.log(
            'Gerando instalador local...'
        );

    }


    console.log('');


    const result =
        runCommand(
            command
        );


    /* ------------------------------------------------------------------------
       ERRO AO INICIAR
       ------------------------------------------------------------------------ */

    if (
        result.error
    ) {

        console.error('');
        console.error(
            'Erro ao iniciar o processo:'
        );

        console.error(
            result.error
        );

    }


    /* ------------------------------------------------------------------------
       FALHA
       ------------------------------------------------------------------------ */

    if (
        result.status !== 0
    ) {

        console.error('');
        console.error(
            shouldPublish
                ? 'A compilação/publicação falhou.'
                : 'A compilação falhou.'
        );


        console.error(
            'Restaurando a versão anterior...'
        );


        restoreOriginalFiles(
            originalPackage,
            originalPackageLock
        );


        console.error('');
        console.error(
            'A versão anterior foi restaurada.'
        );


        process.exit(
            result.status || 1
        );

    }


    /* ------------------------------------------------------------------------
       SUCESSO
       ------------------------------------------------------------------------ */

    writeJson(
        lastBuildPath,
        {
            version:
                newVersion,

            builtAt:
                new Date()
                    .toISOString(),

            published:
                shouldPublish
        }
    );


    console.log('');
    console.log(
        '==================================================='
    );


    if (
        shouldPublish
    ) {

        console.log(
            ` Versão ${newVersion} compilada e publicada!`
        );

    } else {

        console.log(
            ` Build ${newVersion} concluída com sucesso!`
        );

    }


    console.log(
        '==================================================='
    );


    console.log('');


    if (
        shouldPublish
    ) {

        console.log(
            `GitHub Release: v${newVersion}`
        );

        console.log('');
        console.log(
            'O aplicativo instalado poderá detectar essa versão automaticamente.'
        );

    } else {

        console.log(
            'Arquivos gerados em:'
        );

        console.log(
            path.join(
                rootDir,
                'release'
            )
        );

    }


    console.log('');

}


/* ==========================================================================
   ERRO INESPERADO
   ========================================================================== */

main().catch(
    error => {

        console.error('');
        console.error(
            'Erro inesperado:'
        );

        console.error(
            error
        );


        try {

            rl.close();

        } catch {

            // Nada a fazer.

        }


        process.exit(1);

    }
);