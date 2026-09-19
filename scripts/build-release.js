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
      Primeiro usamos nosso histórico próprio.
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

            // continua

        }

    }


    /*
      Se ainda não existir histórico, tentamos descobrir
      pelo latest.yml gerado pelo electron-builder.
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

            // continua

        }

    }


    return null;

}


/* ==========================================================================
   PERGUNTA NO TERMINAL
   ========================================================================== */

const rl =
    readline.createInterface({
        input:
            process.stdin,

        output:
            process.stdout
    });


function question(
    text
) {

    return new Promise(
        resolve => {

            rl.question(
                text,
                answer => {

                    resolve(
                        String(answer)
                            .trim()
                    );

                }
            );

        }
    );

}


/* ==========================================================================
   BUILD
   ========================================================================== */

async function main() {

    console.log('');
    console.log(
        '==============================================='
    );
    console.log(
        '      SISTEMA OFICINA - NOVA COMPILAÇÃO'
    );
    console.log(
        '==============================================='
    );
    console.log('');


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
            'Use o formato: 1.0.1'
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


    console.log('');
    console.log(
        `Será gerado: Sistema Oficina ${newVersion}`
    );
    console.log('');


    const confirmation =
        await question(
            'Continuar com a compilação? (s/n): '
        );


    if (
        confirmation.toLowerCase() !==
        's' &&
        confirmation.toLowerCase() !==
        'sim'
    ) {

        console.log('');
        console.log(
            'Compilação cancelada.'
        );

        rl.close();

        return;

    }


    rl.close();


    /* --------------------------------------------------------------------------
       ATUALIZA PACKAGE.JSON
       -------------------------------------------------------------------------- */

    packageJson.version =
        newVersion;


    writeJson(
        packagePath,
        packageJson
    );


    /* --------------------------------------------------------------------------
       ATUALIZA PACKAGE-LOCK.JSON
       -------------------------------------------------------------------------- */

    if (
        hasPackageLock
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

    console.log('');
    console.log(
        'Gerando instalador...'
    );
    console.log('');


    /* --------------------------------------------------------------------------
       EXECUTA BUILD REAL
       -------------------------------------------------------------------------- */

    const result =
        spawnSync(
            'npm run electron:build:raw',
            {
                cwd:
                    rootDir,

                stdio:
                    'inherit',

                shell:
                    true
            }
        );


    /* --------------------------------------------------------------------------
       BUILD FALHOU
       -------------------------------------------------------------------------- */

    if (
        result.error
    ) {

        console.error('');
        console.error(
            'Erro ao iniciar o processo de compilação:'
        );

        console.error(
            result.error
        );

    }

    if (
        result.status !== 0
    ) {

        console.error('');
        console.error(
            'A compilação falhou.'
        );

        console.error(
            'Restaurando a versão anterior...'
        );


        fs.writeFileSync(
            packagePath,
            originalPackage,
            'utf8'
        );


        if (
            hasPackageLock &&
            originalPackageLock
        ) {

            fs.writeFileSync(
                packageLockPath,
                originalPackageLock,
                'utf8'
            );

        }


        console.error('');
        console.error(
            'A versão anterior foi restaurada.'
        );


        process.exit(
            result.status || 1
        );

    }


    /* --------------------------------------------------------------------------
       BUILD BEM-SUCEDIDO
       -------------------------------------------------------------------------- */

    writeJson(
        lastBuildPath,
        {
            version:
                newVersion,

            builtAt:
                new Date()
                    .toISOString()
        }
    );


    console.log('');
    console.log(
        '==============================================='
    );

    console.log(
        ` Build ${newVersion} concluída com sucesso!`
    );

    console.log(
        '==============================================='
    );

    console.log('');

    console.log(
        'Arquivos disponíveis na pasta:'
    );

    console.log(
        path.join(
            rootDir,
            'release'
        )
    );

    console.log('');

}


main().catch(
    error => {

        console.error(
            'Erro inesperado:',
            error
        );

        rl.close();

        process.exit(1);

    }
);