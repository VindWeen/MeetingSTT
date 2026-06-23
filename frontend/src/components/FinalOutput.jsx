import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Download, CheckCircle, FileText } from 'lucide-react';

export default function FinalOutput({ meeting }) {
  const [copied, setCopied] = React.useState(false);

  const markdownContent = meeting?.finalMarkdown || '';

  const handleCopy = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCopyFormatted = async () => {
    if (!markdownContent) return;
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.pointerEvents = 'none';
      container.style.opacity = '0';

      let html = markdownContent
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br />');

      html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
      container.innerHTML = html;
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNode(container);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      document.body.removeChild(container);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy formatted text:', err);
    }
  };

  const handleDownload = (format) => {
    if (!markdownContent) return;
    const filename = `${meeting.title.replace(/\s+/g, '_')}.${format}`;
    let blob;

    if (format === 'md') {
      blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    } else if (format === 'doc' || format === 'docx') {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${meeting.title}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1f2937; }
          h1 { color: #312e81; }
          h2 { color: #4338ca; border-bottom: 1px solid #e4e7ef; padding-bottom: 5px; }
          li { margin-bottom: 5px; }
        </style>
        </head>
        <body>
          ${markdownContent
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br />')}
        </body>
        </html>
      `;
      blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-brand-500" />
          <h2 className="text-xs font-bold text-surface-700 tracking-wider uppercase">Bài viết hoàn chỉnh</h2>
        </div>

        {markdownContent && (
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={handleCopyFormatted}
              className="text-[10px] text-surface-600 hover:text-surface-800 bg-white border border-surface-200 hover:border-surface-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copied ? (
                <><CheckCircle className="w-3 h-3 text-emerald-500" /> Đã sao chép</>
              ) : (
                <><Copy className="w-3 h-3" /> Sao chép</>
              )}
            </button>

            {/* Download dropdown */}
            <div className="relative group">
              <button className="text-[10px] text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-brand-sm">
                <Download className="w-3 h-3" /> Tải về
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-surface-200 rounded-xl overflow-hidden shadow-lg hidden group-hover:block z-10 fade-up">
                <button
                  onClick={() => handleDownload('md')}
                  className="w-full text-left px-4 py-2.5 text-[10px] font-medium text-surface-600 hover:bg-surface-50 hover:text-surface-800 border-b border-surface-100"
                >
                  File Markdown (.md)
                </button>
                <button
                  onClick={() => handleDownload('docx')}
                  className="w-full text-left px-4 py-2.5 text-[10px] font-medium text-surface-600 hover:bg-surface-50 hover:text-surface-800"
                >
                  File Word (.docx)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Markdown Preview */}
      <div className="flex-1 overflow-y-auto p-5">
        {markdownContent ? (
          <div className="prose prose-sm max-w-none leading-relaxed">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-surface-900 border-b border-surface-200 pb-2 mt-5 mb-3 first:mt-0" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-base font-semibold text-brand-700 mt-4 mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-surface-700 mt-3 mb-1.5" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 pl-2 my-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 pl-2 my-2" {...props} />,
                li: ({ node, ...props }) => <li className="text-xs text-surface-700" {...props} />,
                p: ({ node, ...props }) => <p className="text-xs leading-relaxed text-surface-700 my-2" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-surface-800" {...props} />,
                code: ({ node, inline, ...props }) => (
                  <code className="bg-surface-100 border border-surface-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-brand-700" {...props} />
                )
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-surface-400 text-xs">
            <FileText className="w-8 h-8 text-surface-200 mb-3" />
            <p className="italic">Chưa có bài viết hoàn chỉnh.<br />Hãy chốt nội dung thảo luận với AI ở khung trên để biên tập tài liệu cuối.</p>
          </div>
        )}
      </div>
    </div>
  );
}
