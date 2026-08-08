CREATE OR ALTER PROCEDURE di.ArchiveBrowser_Get
    @DocumentTypesJson nvarchar(max) = null,
    @CollectionsJson nvarchar(max) = null,
    @VendorSourcesJson nvarchar(max) = null,
    @TitleSearch nvarchar(200) = null
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @docTypeFilter TABLE (value nvarchar(400) PRIMARY KEY);
    DECLARE @collectionFilter TABLE (value nvarchar(400) PRIMARY KEY);
    DECLARE @vendorFilter TABLE (value nvarchar(400) PRIMARY KEY);

    IF ISJSON(@DocumentTypesJson) = 1
        INSERT INTO @docTypeFilter(value)
        SELECT DISTINCT LTRIM(RTRIM([value]))
        FROM OPENJSON(@DocumentTypesJson)
        WHERE LTRIM(RTRIM([value])) <> '';

    IF ISJSON(@CollectionsJson) = 1
        INSERT INTO @collectionFilter(value)
        SELECT DISTINCT LTRIM(RTRIM([value]))
        FROM OPENJSON(@CollectionsJson)
        WHERE LTRIM(RTRIM([value])) <> '';

    IF ISJSON(@VendorSourcesJson) = 1
        INSERT INTO @vendorFilter(value)
        SELECT DISTINCT LTRIM(RTRIM([value]))
        FROM OPENJSON(@VendorSourcesJson)
        WHERE LTRIM(RTRIM([value])) <> '';

    ;WITH LatestCategorization AS (
        SELECT
            c.*,
            rn = ROW_NUMBER() OVER (
                PARTITION BY c.documentID
                ORDER BY c.dt DESC, c.categorizationID DESC
            )
        FROM di.Categorization c
    ),
    BaseDocs AS (
        SELECT
            d.documentID,
            d.currentState,
            d.originalFileName,
            d.currentFileName,
            archiveFileName =
                COALESCE(
                    NULLIF(d.archiveFileName, ''),
                    NULLIF(lc.archiveFileName, ''),
                    NULLIF(JSON_VALUE(lc.catJson, '$.archiveFileName'), ''),
                    NULLIF(d.currentFileName, '')
                ),
            d.archivePath,
            dtAdded = d.createdUtc,
            d.updatedUtc,
            d.collectionID,
            collectionName = col.collectionName,
            collectionPath =
                COALESCE(
                    NULLIF(JSON_VALUE(lc.catJson, '$.collection.collectionPath'), ''),
                    col.collectionName
                ),
            d.mediaTypeID,
            mediaTypeName =
                COALESCE(
                    NULLIF(JSON_VALUE(lc.catJson, '$.mediaType.mediaTypeName'), ''),
                    mt.mediaTypeName
                ),
            d.purposeID,
            purposeName =
                COALESCE(
                    NULLIF(JSON_VALUE(lc.catJson, '$.purpose.purposeName'), ''),
                    p.purposeName
                ),
            documentType =
                NULLIF(JSON_VALUE(lc.catJson, '$.documentType'), ''),
            documentDate =
                NULLIF(JSON_VALUE(lc.catJson, '$.documentDate'), ''),
            title =
                COALESCE(
                    NULLIF(JSON_VALUE(lc.catJson, '$.title'), ''),
                    NULLIF(d.currentFileName, ''),
                    NULLIF(d.originalFileName, '')
                ),
            vendorSource =
                NULLIF(JSON_VALUE(lc.catJson, '$.vendor'), ''),
            amount =
                NULLIF(JSON_VALUE(lc.catJson, '$.amount'), ''),
            catJson = lc.catJson,
            categorizationDt = lc.dt
        FROM di.Document d
        LEFT JOIN LatestCategorization lc
            ON lc.documentID = d.documentID
           AND lc.rn = 1
        LEFT JOIN di.Collection col
            ON col.collectionID = d.collectionID
        LEFT JOIN di.MediaType mt
            ON mt.mediaTypeID = d.mediaTypeID
        LEFT JOIN di.Purpose p
            ON p.purposeID = d.purposeID
        WHERE
            COALESCE(
                NULLIF(d.archiveFileName, ''),
                NULLIF(lc.archiveFileName, ''),
                NULLIF(JSON_VALUE(lc.catJson, '$.archiveFileName'), ''),
                NULLIF(d.currentFileName, '')
            ) IS NOT NULL
    ),
    FilteredDocs AS (
        SELECT *
        FROM BaseDocs b
        WHERE
            (
                NOT EXISTS (SELECT 1 FROM @docTypeFilter)
                OR EXISTS (SELECT 1 FROM @docTypeFilter f WHERE f.value = ISNULL(b.documentType, ''))
            )
            AND (
                NOT EXISTS (SELECT 1 FROM @collectionFilter)
                OR EXISTS (SELECT 1 FROM @collectionFilter f WHERE f.value = ISNULL(b.collectionPath, ''))
            )
            AND (
                NOT EXISTS (SELECT 1 FROM @vendorFilter)
                OR EXISTS (SELECT 1 FROM @vendorFilter f WHERE f.value = ISNULL(b.vendorSource, ''))
            )
            AND (
                NULLIF(LTRIM(RTRIM(@TitleSearch)), '') IS NULL
                OR CONCAT(
                    ISNULL(b.title, ''), ' ',
                    ISNULL(b.archiveFileName, ''), ' ',
                    ISNULL(b.vendorSource, ''), ' ',
                    ISNULL(b.collectionPath, ''), ' ',
                    ISNULL(b.documentType, '')
                ) LIKE '%' + @TitleSearch + '%'
            )
    )
    SELECT ResultJson = (
        SELECT
            Status = 'OK',
            Message = '',
            Data = JSON_QUERY((
                SELECT
                    Documents = JSON_QUERY((
                        SELECT
                            documentID,
                            currentState,
                            originalFileName,
                            currentFileName,
                            archiveFileName,
                            archivePath,
                            dtAdded,
                            updatedUtc,
                            collectionID,
                            collectionName,
                            collectionPath,
                            mediaTypeID,
                            mediaTypeName,
                            purposeID,
                            purposeName,
                            documentType,
                            documentDate,
                            title,
                            vendorSource,
                            amount,
                            categorizationDt,
                            catJson = JSON_QUERY(catJson)
                        FROM FilteredDocs
                        ORDER BY dtAdded DESC, documentID DESC
                        FOR JSON PATH
                    )),
                    Filters = JSON_QUERY((
                        SELECT
                            DocumentTypes = JSON_QUERY((
                                SELECT DISTINCT value = documentType
                                FROM BaseDocs
                                WHERE documentType IS NOT NULL
                                ORDER BY value
                                FOR JSON PATH
                            )),
                            Collections = JSON_QUERY((
                                SELECT DISTINCT value = collectionPath
                                FROM BaseDocs
                                WHERE collectionPath IS NOT NULL
                                ORDER BY value
                                FOR JSON PATH
                            )),
                            VendorSources = JSON_QUERY((
                                SELECT DISTINCT value = vendorSource
                                FROM BaseDocs
                                WHERE vendorSource IS NOT NULL
                                ORDER BY value
                                FOR JSON PATH
                            ))
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    ))
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ))
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );
END
