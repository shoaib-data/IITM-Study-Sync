import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResourceItem } from '../types';
import {
  subscribeResources,
  addResource,
  updateResource,
  deleteResource,
  moveResourceOrder,
  validateResourceUrl,
} from '../lib/resourcesService';
import {
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Check,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Link2,
} from 'lucide-react';

export const ResourcesView: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = !!userProfile?.isAdmin;

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Resource Form State
  const [headingInput, setHeadingInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState(false);

  // Editing Resource State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHeading, setEditHeading] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Moving State
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeResources(
      (items) => {
        setResources(items);
        setLoading(false);
      },
      (err) => {
        console.error('Resources subscription error:', err);
        setErrorMsg('Failed to load resources. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle Add Resource
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const heading = headingInput.trim();
    const url = urlInput.trim();
    const desc = descInput.trim();

    if (!heading) {
      setFormError('Please enter a resource heading.');
      return;
    }

    const validation = validateResourceUrl(url);
    if (!validation.isValid) {
      setFormError(validation.error || 'URL must start with https://');
      return;
    }

    setIsSubmitting(true);
    try {
      await addResource({
        heading,
        url,
        description: desc || undefined,
        currentResources: resources,
      });

      setHeadingInput('');
      setUrlInput('');
      setDescInput('');
      setAddSuccessMsg(true);
      setTimeout(() => setAddSuccessMsg(false), 3000);
    } catch (err: any) {
      console.error('Error adding resource:', err);
      setFormError(err.message || 'Failed to add resource.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Editing
  const startEditing = (res: ResourceItem) => {
    setEditingId(res.id);
    setEditHeading(res.heading);
    setEditUrl(res.url);
    setEditDesc(res.description || '');
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditHeading('');
    setEditUrl('');
    setEditDesc('');
    setEditError(null);
  };

  // Save Edit
  const handleSaveEdit = async (id: string) => {
    setEditError(null);
    const heading = editHeading.trim();
    const url = editUrl.trim();
    const desc = editDesc.trim();

    if (!heading) {
      setEditError('Please enter a heading.');
      return;
    }

    const validation = validateResourceUrl(url);
    if (!validation.isValid) {
      setEditError(validation.error || 'URL must start with https://');
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateResource(id, {
        heading,
        url,
        description: desc || undefined,
      });
      setEditingId(null);
    } catch (err: any) {
      console.error('Error updating resource:', err);
      setEditError(err.message || 'Failed to update resource.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Confirm Delete
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteResource(id);
      setDeletingId(null);
    } catch (err: any) {
      console.error('Error deleting resource:', err);
      alert('Failed to delete resource: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Move Up / Down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const item = resources[index];
    if (!item) return;

    setMovingId(item.id);
    try {
      await moveResourceOrder(resources, index, direction);
    } catch (err: any) {
      console.error('Error reordering resource:', err);
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Resources
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Mode</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Curated portals, documentation, and external reference links for IIT Madras BS students.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Add Resource Form */}
      {isAdmin && (
        <div
          id="admin-add-resource-panel"
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-2xs">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add New Resource
              </h2>
            </div>
            <span className="text-[11px] font-medium text-zinc-400">
              Admins only
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {addSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Resource successfully added and published!</span>
            </div>
          )}

          <form onSubmit={handleAddResource} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="resource-heading-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Resource Heading <span className="text-rose-500">*</span>
                </label>
                <input
                  id="resource-heading-input"
                  type="text"
                  value={headingInput}
                  onChange={(e) => setHeadingInput(e.target.value)}
                  placeholder="e.g. IITM BS Official Portal"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label
                  htmlFor="resource-url-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Resource URL <span className="text-rose-500">*</span>{' '}
                  <span className="text-[11px] font-normal text-zinc-400">
                    (must start with https://)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    id="resource-url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://study.iitm.ac.in/ds/"
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all placeholder:text-zinc-400 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="resource-desc-input"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Description{' '}
                <span className="text-[11px] font-normal text-zinc-400">
                  (optional)
                </span>
              </label>
              <textarea
                id="resource-desc-input"
                rows={2}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Brief summary or instructions on what this link is used for..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all placeholder:text-zinc-400 resize-y"
              />
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                id="add-resource-submit-btn"
                type="submit"
                disabled={isSubmitting || !headingInput.trim() || !urlInput.trim()}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding Resource...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Resource</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Resource Cards Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <span className="text-xs sm:text-sm">Loading resources...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : resources.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No resources available yet
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1.5 leading-relaxed">
            {isAdmin
              ? 'No resources have been added yet. Use the form above to add reference materials, official portals, or study guides.'
              : 'Official and curated study links will appear here once published by the program administrator.'}
          </p>
        </div>
      ) : (
        /* Resource Cards List */
        <div className="space-y-4" id="resources-cards-list">
          {resources.map((item, index) => {
            const isEditing = editingId === item.id;
            const isFirst = index === 0;
            const isLast = index === resources.length - 1;
            const isMoving = movingId === item.id;

            return (
              <div
                key={item.id}
                id={`resource-card-${item.id}`}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                {isEditing ? (
                  /* Admin Inline Edit Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Edit Resource
                      </span>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {editError && (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Heading <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editHeading}
                          onChange={(e) => setEditHeading(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Link URL <span className="text-rose-500">*</span>{' '}
                          <span className="text-[10px] font-normal text-zinc-400">
                            (must start with https://)
                          </span>
                        </label>
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Description <span className="text-[10px] font-normal text-zinc-400">(optional)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-y"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSavingEdit}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={isSavingEdit || !editHeading.trim() || !editUrl.trim()}
                        className="px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs"
                      >
                        {isSavingEdit ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card Presentation */
                  <div>
                    {/* Top Row: Heading and Admin Controls (if admin) */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Heading on top */}
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
                          {item.heading}
                        </h3>

                        {/* Link below heading (clickable, opens in new tab with rel="noopener noreferrer") */}
                        <div className="mt-1.5">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all group transition-colors"
                            title={`Open ${item.heading} in a new tab`}
                          >
                            <span className="font-mono text-xs">{item.url}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </div>

                        {/* Description below the link if present */}
                        {item.description && item.description.trim().length > 0 && (
                          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Admin Controls (Only rendered if isAdmin is true) */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0 bg-zinc-50 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => handleMove(index, 'up')}
                            disabled={isFirst || isMoving}
                            title="Move Up"
                            aria-label="Move Up"
                            className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => handleMove(index, 'down')}
                            disabled={isLast || isMoving}
                            title="Move Down"
                            aria-label="Move Down"
                            className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            title="Edit Resource"
                            aria-label="Edit Resource"
                            className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            title="Delete Resource"
                            aria-label="Delete Resource"
                            className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Delete Resource
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Are you sure you want to remove this resource link? Students will no longer be able to see or access it from this page.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Resource</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
