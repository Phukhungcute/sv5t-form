"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { supabase } from "@/lib/supabase";
import { STANDARD } from "@/lib/constants";

type Student = {
  id?: number | string;
  mssv: string;
  full_name: string;
  birth_date?: string | null;
  gender?: string | null;
  class_name?: string | null;
};

type ProofRecord = {
  id: number;
  mssv: string;
  version: number;
  file_path: string;
  status?: string | null;
  created_at?: string | null;
  is_edit?: boolean | null;
};

type EditProofRecord = {
  id: number;
  mssv: string;
  version: number;
  base_version: number;
  file_path: string;
  status?: string | null;
  created_at?: string | null;
};

type ArchiveManifest = {
  archive_version: number;
  created_at: string;
  export_type: "json" | "pdf" | "all";
  student_count: number;
  selected_mssv: string[];
  notes?: string;
};

type ArchiveStudent = {
  archive_version?: number;
  archived_at?: string;
  student: Student;
  submissions: SubmissionRecord[];
  proofs: ProofRecord[];
  edit_proofs: EditProofRecord[];
};

type SubmissionRecord = {
  id?: number | string;
  mssv: string;
  version: number;
  data: Record<string, unknown>;
  status?: string | null;
  created_at?: string | null;
  is_edit?: boolean | null;
};

type ArchiveListItem = {
  student: Student;
  submission: SubmissionRecord | null;
  proof: ProofRecord | null;
  proofEdit: EditProofRecord | null;
};

const PAGE_SIZE = 25;

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "student";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ArchivePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [editProofs, setEditProofs] = useState<EditProofRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedMssv, setSelectedMssv] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"json" | "pdf" | "all" | null>(null);
  const [message, setMessage] = useState("");
  
  const [archiveManifest, setArchiveManifest] =
    useState<ArchiveManifest | null>(null);

  const [archiveStudents, setArchiveStudents] =
    useState<ArchiveStudent[]>([]);

  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveStatusFilter, setArchiveStatusFilter] = useState("all");
  const [archivePage, setArchivePage] = useState(1);

  const [selectedArchiveStudent, setSelectedArchiveStudent] =
    useState<ArchiveListItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        router.replace("/");
        return;
      }

      const [studentResult, proofResult, editProofResult, submissionResult] = await Promise.all([
        supabase
          .from("students")
          .select("id, mssv, full_name, birth_date, gender, class_name")
          .order("mssv", { ascending: true }),
        supabase
          .from("proofs")
          .select("id, mssv, version, file_path, status, created_at, is_edit")
          .order("version", { ascending: true }),
        supabase
          .from("edit_proofs")
          .select("id, mssv, version, base_version, file_path, status, created_at")
          .order("version", { ascending: true }),
        supabase
          .from("submissions")
          .select("id, mssv, version, data, status, created_at, reviewed_at, is_edit")
          .order("version", { ascending: false }),
      ]);   

      if (studentResult.error) throw studentResult.error;
      if (proofResult.error) throw proofResult.error;
      if (editProofResult.error) throw editProofResult.error;
      if (submissionResult.error) throw submissionResult.error;

      setStudents((studentResult.data ?? []) as Student[]);
      setProofs((proofResult.data ?? []) as ProofRecord[]);
      setEditProofs((editProofResult.data ?? []) as EditProofRecord[]);
      setSubmissions((submissionResult.data ?? []) as SubmissionRecord[]);
    } catch (error) {
      console.error("ARCHIVE LOAD ERROR:", error);
      setMessage("Không thể tải dữ liệu lưu trữ. Hãy kiểm tra quyền truy cập và cấu trúc bảng.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadData(); }, [loadData]);

  const classes = useMemo(
    () => [...new Set(students.map((student) => student.class_name).filter((v): v is string => Boolean(v)))].sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
  const query = search.trim().toLocaleLowerCase("vi");

  return students.filter((student) => {
    const matchesQuery =
      !query ||
      student.mssv.toLocaleLowerCase("vi").includes(query) ||
      student.full_name.toLocaleLowerCase("vi").includes(query);

    const matchesFilter =
      classFilter === "all" ||
      (classFilter === "has-submission"
        ? Boolean(latestSubmissionFor(student.mssv))
        : classFilter === `class:${student.class_name}`);

    return matchesQuery && matchesFilter;
  });
}, [students, search, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pageStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageSelected = pageStudents.length > 0 && pageStudents.every((student) => selectedMssv.includes(student.mssv));
  const selectedStudents = students.filter((student) => selectedMssv.includes(student.mssv));

  useEffect(() => { setPage(1); }, [search, classFilter]);

  function toggleStudent(mssv: string) {
    setSelectedMssv((current) => current.includes(mssv) ? current.filter((item) => item !== mssv) : [...current, mssv]);
  }

  function toggleCurrentPage() {
    const currentPageIds = pageStudents.map((student) => student.mssv);
    setSelectedMssv((current) => pageSelected
      ? current.filter((mssv) => !currentPageIds.includes(mssv))
      : [...new Set([...current, ...currentPageIds])]);
  }

  function latestSubmissionFor(mssv: string) {
    return submissions
      .filter((item) => item.mssv === mssv)
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;

        return dateB - dateA || b.version - a.version;
      })[0] ?? null;
  }
  
  function recordsFor(mssv: string) {
    return {
      original: proofs.filter((item) => item.mssv === mssv),
      edited: editProofs.filter((item) => item.mssv === mssv),
    };
  }

  async function fetchPdf(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from("proofs").download(path);
    if (error || !data) throw new Error(`Không tải được PDF: ${path}${error ? ` (${error.message})` : ""}`);
    return data;
  }

  async function exportArchive(kind: "json" | "pdf" | "all") {
    if (!selectedMssv.length) {
      setMessage("Vui lòng chọn ít nhất một sinh viên.");
      return;
    }

    setExporting(kind);
    setMessage("");
    try {
      const zip = new JSZip();
      const selected = selectedStudents;
      const manifest = {
        archive_version: 1,
        created_at: new Date().toISOString(),
        export_type: kind,
        student_count: selected.length,
        selected_mssv: selected.map((student) => student.mssv),
        notes: "Bản lưu trữ được tạo từ trang quản trị SV5T Form.",
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const errors: string[] = [];

      if (kind === "json" || kind === "all") {
        for (const student of selected) {
          const { original, edited } = recordsFor(student.mssv);
          const { data: latestSubmission, error: submissionsError } = await supabase
            .from("submissions")
            .select("*")
            .eq("mssv", student.mssv)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (submissionsError) {
            errors.push(`${student.mssv}: không tải được submissions (${submissionsError.message})`);
          }

          const archiveStudent = {
            archive_version: 1,
            archived_at: new Date().toISOString(),
            student,
            submissions: latestSubmission ? [latestSubmission] : [],
            proofs: original.map(({ id, mssv, version, file_path, status, created_at }) => ({ id, mssv, version, file_path, status, created_at })),
            edit_proofs: edited.map(({ id, mssv, version, base_version, file_path, status, created_at }) => ({ id, mssv, version, base_version, file_path, status, created_at })),
          };
          zip.folder("students")?.file(`${safeFileName(student.mssv)}.json`, JSON.stringify(archiveStudent, null, 2));
        }
      }

      if (kind === "pdf" || kind === "all") {
        for (const student of selected) {
          const { original, edited } = recordsFor(student.mssv);
          const folder = zip.folder(`evidence/${safeFileName(student.mssv)}`);
          const files = [
            ...original.map((record) => ({ path: record.file_path, name: `ban-dau-v${record.version}.pdf` })),
            ...edited.map((record) => ({ path: record.file_path, name: `sau-chinh-sua-v${record.version}-base-v${record.base_version}.pdf` })),
          ];
          for (const file of files) {
            try {
              const blob = await fetchPdf(file.path);
              folder?.file(file.name, blob);
            } catch (error) {
              errors.push(`${student.mssv}: ${error instanceof Error ? error.message : "Lỗi tải PDF"}`);
            }
          }
        }
      }

      if (errors.length) {
        zip.file("export-errors.txt", errors.join("\n"));
      }

      // Tạo ZIP chính thức chứa manifest.json và students/
      const officialArchive = new JSZip();

      officialArchive.file(
        "manifest.json",
        JSON.stringify(manifest, null, 2),
      );

      // Chuyển các file JSON sinh viên từ ZIP tạm sang ZIP chính thức.
      const studentFiles = Object.values(zip.files).filter(
        (entry) =>
          !entry.dir &&
          entry.name.startsWith("students/") &&
          entry.name.toLowerCase().endsWith(".json"),
      );

      for (const entry of studentFiles) {
        const content = await entry.async("uint8array");

        officialArchive.file(entry.name, content);
      }

      // Tạo ZIP chính thức.
      const officialBlob = await officialArchive.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 5 },
      });

      // Đưa ZIP chính thức vào ZIP bên ngoài.
      zip.file("SV5T-Official-Archive.zip", officialBlob);

      // Xóa manifest và students khỏi ZIP bên ngoài để tránh trùng dữ liệu.
      zip.remove("manifest.json");
      zip.remove("students");

      // Tạo ZIP lưu trữ tổng.
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 5 },
      });

      const date = new Date().toISOString().slice(0, 10);

      downloadBlob(blob, `SV5T-Archive-${kind}-${date}.zip`);
      setMessage(errors.length
        ? `Đã tạo ZIP nhưng có ${errors.length} lỗi. Mở export-errors.txt trong ZIP để kiểm tra trước khi dùng bản lưu trữ.`
        : `Đã tạo gói ZIP cho ${selected.length} sinh viên.`);
    } catch (error) {
      console.error("ARCHIVE EXPORT ERROR:", error);
      setMessage(error instanceof Error ? error.message : "Không thể tạo gói lưu trữ.");
    } finally {
      setExporting(null);
    }
  }

  async function readArchiveZip(file: File) {
    setArchiveError("");

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setArchiveError("Vui lòng chọn một file ZIP lưu trữ SV5T.");
      return;
    }

    setArchiveLoading(true);

    try {
      const zip = await JSZip.loadAsync(file);

      const manifestFile = zip.file("manifest.json");

      if (!manifestFile) {
        throw new Error("Không tìm thấy manifest.json trong file ZIP.");
      }

      const manifestText = await manifestFile.async("text");
      const manifest = JSON.parse(manifestText) as ArchiveManifest;

      if (
        typeof manifest.archive_version !== "number" ||
        !manifest.created_at ||
        !Array.isArray(manifest.selected_mssv)
      ) {
        throw new Error("manifest.json không đúng cấu trúc bản lưu trữ SV5T.");
      }

      const studentFiles = Object.values(zip.files).filter(
        (entry) =>
          !entry.dir &&
          entry.name.startsWith("students/") &&
          entry.name.toLowerCase().endsWith(".json"),
      );

      if (studentFiles.length === 0) {
        throw new Error("Không tìm thấy file JSON nào trong thư mục students/.");
      }

      const parsedStudents: ArchiveStudent[] = [];
      const errors: string[] = [];

      for (const entry of studentFiles) {
        try {
          const text = await entry.async("text");
          const parsed = JSON.parse(text) as ArchiveStudent;

          if (!parsed.student || !parsed.student.mssv) {
            errors.push(`${entry.name}: thiếu thông tin sinh viên.`);
            continue;
          }

          parsedStudents.push({
            archive_version: parsed.archive_version,
            archived_at: parsed.archived_at,
            student: parsed.student,
            submissions: Array.isArray(parsed.submissions)
              ? parsed.submissions
              : [],
            proofs: Array.isArray(parsed.proofs)
              ? parsed.proofs
              : [],
            edit_proofs: Array.isArray(parsed.edit_proofs)
              ? parsed.edit_proofs
              : [],
          });
        } catch {
          errors.push(`${entry.name}: không thể đọc JSON.`);
        }
      }

      if (parsedStudents.length === 0) {
        throw new Error("Không có dữ liệu sinh viên hợp lệ trong bản lưu trữ.");
      }

      // Chỉ thay bản lưu trữ đang đọc khi bản ZIP mới hợp lệ.
      setArchiveManifest(manifest);
      setArchiveStudents(parsedStudents);
      setArchiveSearch("");
      setArchiveStatusFilter("all");
      setArchivePage(1);
      setSelectedArchiveStudent(null);

      if (errors.length > 0) {
        setArchiveError(
          `Đã đọc ${parsedStudents.length} sinh viên, nhưng có ${errors.length} file bị bỏ qua:\n${errors.join("\n")}`,
        );
      }
    } catch (error) {
      setArchiveError(
        error instanceof Error
          ? error.message
          : "Không thể đọc file ZIP.",
      );
    } finally {
      setArchiveLoading(false);
    }
  }

  function latestVersion<T extends { version: number }>(
    records: T[],
  ): T | null {
    if (records.length === 0) return null;

    return [...records].sort(
      (a, b) => b.version - a.version,
    )[0];
  }

  function latestArchivedSubmission(
  records: SubmissionRecord[],
): SubmissionRecord | null {
  if (records.length === 0) return null;

  return [...records].sort(
    (a, b) => b.version - a.version,
  )[0];
}

  function getArchiveStatus(
    submission: SubmissionRecord | null,
  ): string {
    if (!submission) return "CHƯA NỘP";

    switch (submission.status) {
      case "passed":
        return "ĐẠT";

      case "failed":
        return "KHÔNG ĐẠT";

      case "consider":
        return "XEM XÉT";

      default:
        return "ĐÃ NỘP";
    }
  }

  function getArchiveStatusClass(
    submission: SubmissionRecord | null,
  ): string {
    if (!submission) {
      return "border-gray-200 bg-gray-100 text-gray-600";
    }

    switch (submission.status) {
      case "passed":
        return "border-green-200 bg-green-100 text-green-700";

      case "failed":
        return "border-red-200 bg-red-100 text-red-700";

      case "consider":
        return "border-amber-200 bg-amber-100 text-amber-700";

      default:
        return "border-blue-200 bg-blue-100 text-blue-700";
    }
  }

  const archiveList: ArchiveListItem[] = archiveStudents.map(
    (item) => ({
      student: item.student,
      submission: latestArchivedSubmission(item.submissions),
      proof: latestVersion(item.proofs),
      proofEdit: latestVersion(item.edit_proofs),
    }),
  );

  const filteredArchiveList = archiveList.filter((item) => {
    const query = archiveSearch.trim().toLocaleLowerCase("vi");

    const matchesSearch =
      !query ||
      item.student.mssv.toLocaleLowerCase("vi").includes(query) ||
      item.student.full_name.toLocaleLowerCase("vi").includes(query);

    const status = getArchiveStatus(item.submission);

    const matchesStatus =
      archiveStatusFilter === "all" ||
      (archiveStatusFilter === "submitted" && item.submission !== null) ||
      (archiveStatusFilter === "not-submitted" && item.submission === null) ||
      status === archiveStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const ARCHIVE_PAGE_SIZE = 25;

  const archiveTotalPages = Math.max(
    1,
    Math.ceil(filteredArchiveList.length / ARCHIVE_PAGE_SIZE),
  );

  const paginatedArchiveList = filteredArchiveList.slice(
    (archivePage - 1) * ARCHIVE_PAGE_SIZE,
    archivePage * ARCHIVE_PAGE_SIZE,
  );

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">8. Kho lưu trữ hồ sơ</h1>
            <p className="mt-1 text-gray-600">Chọn sinh viên để xuất hồ sơ JSON và PDF minh chứng.</p>
          </div>
          <button onClick={() => router.push("/admin")} className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">← Quay lại Admin</button>
        </header>

        {message && <div className="mb-4 whitespace-pre-wrap rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{message}</div>}

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo MSSV hoặc họ tên..." className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" />
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="all">Tất cả sinh viên</option>
              <option value="has-submission">Đã có hồ sơ</option>

              <optgroup label="Lọc theo lớp">
                {classes.map((className) => (
                  <option key={className} value={`class:${className}`}>
                    {className}
                  </option>
                ))}
              </optgroup>
            </select>
            <button onClick={() => void loadData()} disabled={loading} className="cursor-pointer rounded-lg border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50">{loading ? "Đang tải..." : "Làm mới"}</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Có {filteredStudents.length} sinh viên phù hợp · Đã chọn {selectedMssv.length}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedMssv(filteredStudents.map((student) => student.mssv))} className="cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">Chọn tất cả kết quả</button>
              <button onClick={() => setSelectedMssv([])} className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">Bỏ chọn</button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? <div className="p-10 text-center text-gray-500">Đang tải danh sách sinh viên...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="w-12 px-4 py-3"><input className="cursor-pointer" type="checkbox" aria-label="Chọn sinh viên trên trang hiện tại" checked={pageSelected} onChange={toggleCurrentPage} /></th>
                    <th className="px-4 py-3">MSSV</th><th className="px-4 py-3">Họ tên</th><th className="px-4 py-3">Lớp</th><th className="px-4 py-3">Hồ sơ cuối cùng</th><th className="px-4 py-3">PDF ban đầu</th><th className="px-4 py-3">PDF chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageStudents.map((student) => {
                    const records = recordsFor(student.mssv);
                    const latest = latestSubmissionFor(student.mssv);
                    return <tr key={student.mssv} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><input className="cursor-pointer" type="checkbox" checked={selectedMssv.includes(student.mssv)} onChange={() => toggleStudent(student.mssv)} aria-label={`Chọn ${student.mssv}`} /></td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{student.mssv}</td>
                      <td className="px-4 py-3">{student.full_name}</td><td className="px-4 py-3">{student.class_name || "—"}</td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <div className="space-y-1">
                            <p className="font-medium text-gray-800">
                              Phiên bản {latest.version}
                            </p>

                            <span
                              className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                                latest.status === "passed"
                                  ? "bg-green-100 text-green-700"
                                  : latest.status === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : latest.status === "consider"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {latest.status === "passed"
                                ? "ĐẠT"
                                : latest.status === "failed"
                                  ? "KHÔNG ĐẠT"
                                  : latest.status === "consider"
                                    ? "XEM XÉT"
                                    : "ĐÃ NỘP"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Chưa có hồ sơ</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><span className={records.original.length ? "text-green-700" : "text-gray-400"}>{records.original.length ? `${records.original.length} bản` : "Không có"}</span></td>
                      <td className="px-4 py-3"><span className={records.edited.length ? "text-green-700" : "text-gray-400"}>{records.edited.length ? `${records.edited.length} bản` : "Không có"}</span></td>
                    </tr>;
                  })}
                  {!pageStudents.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Không tìm thấy sinh viên phù hợp.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-4">
            <p className="text-sm text-gray-500">Trang {page} / {totalPages}</p>
            <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="cursor-pointer rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button><button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="cursor-pointer rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button></div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Xuất bản lưu trữ</h2>
          <p className="mt-1 text-sm text-gray-600">Các tệp được đóng gói thành ZIP. Hồ sơ JSON tổng hợp dữ liệu sinh viên, submissions và metadata của hai loại PDF.</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-4">
            {/* TẢI JSON */}
            <div className="menu-btn-wrapper-inline">
              <button
                type="button"
                disabled={!!exporting || !selectedMssv.length}
                onClick={() => void exportArchive("json")}
                className={`menu-btn menu-btn-inline ${
                  exporting === "json"
                    ? "menu-btn-blue"
                    : "menu-btn-blue"
                } ${!!exporting || !selectedMssv.length ? "menu-btn-disabled" : ""}`}
              >
                {exporting === "json" ? "ĐANG TẠO JSON..." : "Tải JSON hồ sơ"}
              </button>
            </div>

            {/* TẢI PDF */}
            <div className="menu-btn-wrapper-inline">
              <button
                type="button"
                disabled={!!exporting || !selectedMssv.length}
                onClick={() => void exportArchive("pdf")}
                className={`menu-btn menu-btn-inline menu-btn-green ${
                  !!exporting || !selectedMssv.length ? "menu-btn-disabled" : ""
                }`}
              >
                {exporting === "pdf" ? "ĐANG TẢI PDF..." : "Tải PDF minh chứng"}
              </button>
            </div>

            {/* TẢI TOÀN BỘ */}
            <div className="menu-btn-wrapper-inline">
              <button
                type="button"
                disabled={!!exporting || !selectedMssv.length}
                onClick={() => void exportArchive("all")}
                className={`menu-btn menu-btn-inline menu-btn-gray ${
                  !!exporting || !selectedMssv.length ? "menu-btn-disabled" : ""
                }`}
              >
                {exporting === "all"
                  ? "ĐANG TẠO GÓI..."
                  : "Tải toàn bộ (JSON + PDF)"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-amber-700">Trước khi xóa dữ liệu gốc, hãy mở ZIP để kiểm tra export-errors.txt (nếu có), xác minh đủ hồ sơ và PDF, rồi thử đọc lại bản lưu trữ. Không xóa dữ liệu chỉ vì ZIP đã được tạo.</p>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            Đầu đọc bản lưu trữ SV5T
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Kéo thả file ZIP được xuất từ hệ thống hoặc nhấn để chọn file.
            Dữ liệu được đọc trực tiếp trên trình duyệt.
          </p>

          <label
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 px-6 py-10 text-center transition hover:border-blue-500 hover:bg-blue-50"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              const file = event.dataTransfer.files?.[0];

              if (file) {
                void readArchiveZip(file);
              }
            }}
          >
            <span className="text-3xl">📦</span>

            <span className="mt-3 font-semibold text-gray-800">
              {archiveLoading
                ? "Đang đọc bản lưu trữ..."
                : "Kéo thả file ZIP vào đây"}
            </span>

            <span className="mt-1 text-sm text-gray-500">
              Hoặc nhấn để chọn file ZIP từ máy tính
            </span>

            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              disabled={archiveLoading}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void readArchiveZip(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </label>

          {archiveError && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {archiveError}
            </div>
          )}

          {archiveManifest && (
            <>
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Thông tin bản lưu trữ
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Đã đọc thành công {archiveStudents.length} sinh viên.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Archive v{archiveManifest.archive_version}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">Phiên bản lưu trữ</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {archiveManifest.archive_version}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Ngày tạo</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {new Date(archiveManifest.created_at).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Loại bản lưu trữ</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {archiveManifest.export_type.toUpperCase()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Số sinh viên trong manifest</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {archiveManifest.student_count}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-lg font-bold text-gray-900">
                  Danh sách sinh viên trong bản lưu trữ
                </h3>

                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                  <input
                    value={archiveSearch}
                    onChange={(event) => {
                      setArchiveSearch(event.target.value);
                      setArchivePage(1);
                    }}
                    placeholder="Tìm theo MSSV hoặc họ tên..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                  />

                  <select
                    value={archiveStatusFilter}
                    onChange={(event) => {
                      setArchiveStatusFilter(event.target.value);
                      setArchivePage(1);
                    }}
                    className="cursor-pointer rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="submitted">Đã có hồ sơ</option>
                    <option value="not-submitted">Chưa nộp</option>
                    <option value="passed">ĐẠT</option>
                    <option value="failed">KHÔNG ĐẠT</option>
                    <option value="consider">XEM XÉT</option>
                  </select>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">MSSV</th>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Trạng thái / Ver hồ sơ</th>
                        <th className="px-4 py-3">Ver minh chứng</th>
                        <th className="px-4 py-3">Ver minh chứng chỉnh sửa</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {paginatedArchiveList.map((item) => (
                        <tr
                          key={item.student.mssv}
                          onClick={() => setSelectedArchiveStudent(item)}
                          className="cursor-pointer transition hover:bg-blue-50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                            {item.student.mssv}
                          </td>

                          <td className="px-4 py-3">
                            {item.student.full_name}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getArchiveStatusClass(
                                item.submission,
                              )}`}
                            >
                              {getArchiveStatus(item.submission)}
                            </span>

                            {item.submission && (
                              <span className="ml-2 text-gray-500">
                                v{item.submission.version}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {item.proof ? `v${item.proof.version}` : "Không có"}
                          </td>

                          <td className="px-4 py-3">
                            {item.proofEdit
                              ? `v${item.proofEdit.version}`
                              : "Không có"}
                          </td>
                        </tr>
                      ))}

                      {paginatedArchiveList.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-gray-500"
                          >
                            Không tìm thấy sinh viên phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">
                    Có {filteredArchiveList.length} sinh viên · Trang {archivePage} / {archiveTotalPages}
                  </p>

                  <div className="flex gap-2">
                    <button
                      disabled={archivePage <= 1}
                      onClick={() => setArchivePage((value) => Math.max(1, value - 1))}
                      className="cursor-pointer rounded-lg border px-3 py-2 disabled:opacity-40"
                    >
                      Trước
                    </button>

                    <button
                      disabled={archivePage >= archiveTotalPages}
                      onClick={() =>
                        setArchivePage((value) =>
                          Math.min(archiveTotalPages, value + 1),
                        )
                      }
                      className="cursor-pointer rounded-lg border px-3 py-2 disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
        {selectedArchiveStudent && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
    onClick={() => setSelectedArchiveStudent(null)}
  >
    <div
      className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Chi tiết hồ sơ lưu trữ
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            MSSV: {selectedArchiveStudent.student.mssv}
          </p>
        </div>

        <button
          onClick={() => setSelectedArchiveStudent(null)}
          className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Đóng
        </button>
      </div>

      <div className="space-y-6 p-6">
        <section>
          <h3 className="mb-3 font-bold text-gray-900">
            Thông tin sinh viên
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(selectedArchiveStudent.student).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <p className="text-xs text-gray-500">{key}</p>

                  <p className="mt-1 break-words text-sm font-medium text-gray-800">
                    {value == null || value === ""
                      ? "Chưa có"
                      : String(value)}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-bold text-gray-900">
            Thông tin hồ sơ
          </h3>

          {selectedArchiveStudent.submission ? (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Trạng thái</p>
                  <p className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getArchiveStatusClass(
                        selectedArchiveStudent.submission,
                      )}`}
                    >
                      {getArchiveStatus(selectedArchiveStudent.submission)}
                    </span>
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Phiên bản</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    v{selectedArchiveStudent.submission.version}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Ngày tạo</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedArchiveStudent.submission.created_at
                      ? new Date(
                          selectedArchiveStudent.submission.created_at,
                        ).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })
                      : "Chưa có"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(
                  selectedArchiveStudent.submission.data ?? {},
                ).map(([key, value]) => {
                  const normalizedKey = key
                    .replace(/[_-]/g, "")
                    .toLowerCase();

                  const generalLabels: Record<string, string> = {
                    fullname: "Họ và tên",
                    studentid: "Mã số sinh viên",
                    mssv: "Mã số sinh viên",
                    gender: "Giới tính",
                    birthdate: "Ngày sinh",
                    ethnicity: "Dân tộc",
                    major: "Chuyên ngành đào tạo",
                    classname: "Lớp",
                    faculty: "Khoa",
                    phone: "Số điện thoại",
                    studentyear: "Sinh viên năm thứ",
                    position: "Chức vụ (Đoàn - Hội)",
                    uniondate: "Ngày vào Hội / Ngày vào Đoàn",
                    unionhasdate: "Ngày vào Đoàn",
                    probationhasdate: "Đảng viên dự bị",
                    probationdate: "Ngày vào Đảng — Dự bị",
                    officialhasdate: "Đảng viên chính thức",
                    officialdate: "Ngày vào Đảng — Chính thức",
                    email: "Email",
                    address: "Địa chỉ liên lạc",
                  };

                  let label = generalLabels[normalizedKey] ?? key;

                  for (const [standardKey, standard] of Object.entries(STANDARD)) {
                    if (
                      standardKey
                        .replace(/[_-]/g, "")
                        .toLowerCase() === normalizedKey
                    ) {
                      label = standard.CONTENT;
                      break;
                    }
                  }

                  const displayValue =
                    value == null || value === ""
                      ? "Chưa có dữ liệu"
                      : typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value);

                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <p className="font-medium text-gray-800">
                        {label}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">
                        {displayValue}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
              Sinh viên này chưa có hồ sơ trong bản lưu trữ.
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 font-bold text-gray-900">
            Phiên bản minh chứng
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">
                PDF minh chứng
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {selectedArchiveStudent.proof
                  ? `v${selectedArchiveStudent.proof.version}`
                  : "Không có"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">
                PDF minh chứng chỉnh sửa
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {selectedArchiveStudent.proofEdit
                  ? `v${selectedArchiveStudent.proofEdit.version}`
                  : "Không có"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
)}
      </div>
    </main>
  );
}
