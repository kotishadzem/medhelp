# Medical Documents

Users can keep a personal archive of medical paperwork — Form 100s,
prescriptions, lab results, imaging reports — and search them later
by date, clinic, or study type. Each "study" can have **one or more
attached files**: a single visit that produces, say, a PDF report
plus two photographed pages stays as one document with three files.

## Supported files

- **Formats:** PDF, JPG, PNG, HEIC, HEIF
- **Max size:** 15 MB per upload

## Document types

A fixed enum keeps lists groupable. Each upload also accepts an
optional `customType` free-text field for finer detail (e.g.
"HbA1c", "Abdominal ultrasound — gallbladder").

| Enum            | Default label (en)        |
|-----------------|---------------------------|
| `FORM_100`      | Form 100                  |
| `PRESCRIPTION`  | Prescription              |
| `BLOOD_TEST`    | Blood test                |
| `CT_SCAN`       | CT scan                   |
| `MRI_SCAN`      | MRI scan                  |
| `ULTRASOUND`    | Ultrasound                |
| `ECG`           | ECG                       |
| `LAB_ANALYSIS`  | Lab analysis              |
| `OTHER`         | Other                     |

Georgian and German display names are in
`mobile/lib/i18n/locales/{ka,de}.json` under `documents.type`.

## User flow

1. **Documents** tab in the main bottom bar → list view. Rows that
   have more than one attached file show a small badge with the
   file count.
2. Tap **Upload** → pick one or more files from the device, then
   fill:
   - **Study type** (enum picker)
   - **Exact name** (optional free text)
   - **Clinic** (text input with autocomplete from prior clinics)
   - **Study date** (calendar picker — date the test was performed)
   - **Notes** (optional)
3. Save → server validates each file, writes them to disk, and
   creates **one** document with all the attached files.
4. List shows the new row immediately (React Query invalidation).

## Detail and edit

- The detail screen lists every attached file with its own **Open**
  button (images preview inline, PDFs open in a new tab) and, when
  more than one file is attached, a **Delete** button per file.
- The edit screen lets you change every metadata field and **add
  more files** to the same study, or remove individual files
  (cannot remove the last one — delete the whole document instead).

## Search & filter

The list view supports:

- **Free-text search** — case-insensitive `contains` across
  `fileName`, `customType`, `notes`, `clinic`.
- **Type chip** — one document type at a time, or "All".
- **Clinic chip** — picks from the user's distinct clinics.
- **Date range** — `from` / `to` cover `studyDate`. Both bounds are
  inclusive.

All filters compose via AND. Default sort is `studyDate desc`.

## Where files live

Production: Docker named volume `uploads` mounted at
`/data/uploads` in the backend container. Layout:

```
/data/uploads/
└── documents/
    └── <userId>/
        └── <docId>.<ext>
```

Development: `./uploads/` relative to the backend cwd (configurable
via `UPLOADS_DIR`).

### Backup

The named volume survives `docker compose down && up -d`. To back up
on EC2:

```
docker run --rm -v medhelp_uploads:/data -v /tmp:/backup busybox \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

If disk usage on the volume becomes a concern, the next step is to
detach an EBS volume and mount it at the host's `/data/uploads`
location; nothing in the application needs to change.

## API summary

See `docs/architecture.md` § "Documents subsystem" for the route
table. All routes are auth-protected and ownership-checked per row.
