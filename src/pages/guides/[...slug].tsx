import {readFile} from 'fs/promises';
import {join} from 'path';

import globby from 'globby';
import {MDXRemote} from 'next-mdx-remote';
import {serialize} from 'next-mdx-remote/serialize';

import {remarkPlugins} from '../../../plugins/markdownToHtml';
import rehypeExtractHeadings from '../../../plugins/rehype-extract-headings';
import {MDXComponents} from '../../components/MDX/MDXComponents';
import {getVersionedConfig} from '../../utils/config';

import {MarkdownPage} from 'components/Layout/MarkdownPage';
import {Page} from 'components/Layout/Page';
import JSONRoutes from 'utils/jsonRoutes';
import {logDev} from 'utils/logging';
import templateReplace from 'utils/templateReplace';
import {MDHeadingsList} from 'utils/Types';

const guidesPath = 'src/guides';
const pagesPath = 'src/pages';

export default function VersionedGuide({
  source,
  headings,
  version,
}: {
  source: any;
  headings: MDHeadingsList;
  version: string;
}) {
  return (
    <Page routeTree={JSONRoutes}>
      <MarkdownPage meta={{...source.frontmatter, version}} headings={headings}>
        <MDXRemote {...source} components={MDXComponents} />
      </MarkdownPage>
    </Page>
  );
}

export const getStaticPaths = async () => {
  const routes = [];
  const paths = [];

  // determine available versions from config files
  const versions = (
    await globby('config/v*.config.js', {
      cwd: join(process.cwd(), 'src'),
    })
  ).map(async (file: string) => {
    const v = (file.match(/v(\d+)\.config\.js/) || [])[1];

    return {
      version: v,
    };
  });

  const versionObjects = await Promise.all(versions);

  // determine available guides from filesystem
  const allGuides = (
    await globby(['guides/**/*.{md,mdx}'], {
      cwd: join(process.cwd(), 'src'),
    })
  ).map(
    (path: string) =>
      path
        .replace('guides/', '') // remove guides/ prefix
        .replace(/.mdx?/, '') // remove extension
  );

  // guides without version-specific override
  const baseGuides = allGuides.filter((path: string) => !path.match(/^v\d+/));

  // Across the different versions and different guides, we need routes
  // in the following formats:
  // /guides/[guide] => guide for the latest version
  // /guides/[version] => homepage for the version
  // /guides/[version]/[guide] => guide for the version

  // guides for the latest version
  paths.push(...baseGuides);

  // guides for each version, including the homepage
  paths.push(
    ...versionObjects.flatMap(({version}) => {
      version = `v${version}`;
      return [
        version, // version homepage
        ...baseGuides.map((path) => join(version, path)), // versioned base guides
        ...allGuides.filter((path) => path.startsWith(version)), // versioned overrides
      ];
    })
  );

  // convert paths to routes
  routes.push(
    ...[...new Set(paths)].map((path) => ({params: {slug: path.split('/')}}))
  );

  return {
    paths: routes,
    fallback: false,
  };
};

export async function getStaticProps({params}: {params: any}) {
  const {slug}: {slug: string[]} = params;
  const latestVersion = process.env.NEXT_PUBLIC_LATEST_VERSION as string; // defined in next.config.js
  const versionRE = /^v(\d+)$/;
  let [version, ...guide] = slug;
  let isHomepage = false;

  if (!versionRE.test(version)) {
    // no version specified so use the latest
    version = `v${latestVersion}`;
    guide = slug;
  } else if (!guide || !guide.length) {
    // version with no remainig guide path so use as homepage
    isHomepage = true;
    guide = ['index'];
  }

  const slugAsString = guide.join('/');

  const homepageGlobs = ['md', 'mdx'].flatMap((ext) => [
    `${guidesPath}/${version}/${slugAsString}.${ext}`,
    `${pagesPath}/${slugAsString}.${ext}`,
  ]);

  const guideGlobs = ['md', 'mdx'].flatMap((ext) => [
    `${guidesPath}/${version}/${slugAsString}.${ext}`,
    `${guidesPath}/${slugAsString}.${ext}`,
  ]);

  const files = (await globby(isHomepage ? homepageGlobs : guideGlobs)).sort(
    (a, b) => {
      // prioritize versioned files over non-versioned files
      if (a.match(versionRE) && !b.match(versionRE)) {
        return -1;
      }
      if (!a.match(versionRE) && b.match(versionRE)) {
        return 1;
      }
      return 0;
    }
  );

  const [file] = files;
  if (!file) {
    logDev(`No matching files for route '${slugAsString}'`);
    return {notFound: true};
  }

  logDev(
    `Using '${file}' for route '${slugAsString}'. Available files:`,
    files
  );

  let content = await readFile(join(process.cwd(), file), 'utf8');

  // update template with versioned constants
  content = templateReplace(content, getVersionedConfig(version));

  // remove any html comments (<!-- -->) as these will not parse correctly
  content = content.toString().replace(/<!--([\s\S]*?)-->/g, '');

  // Any {{ VALUE }} that was not replaced in the above step
  // should be replaced with only 1 set of [] brackets. Keeping them as
  // {{ }} double braces will cause the MDX parser to throw an error.
  content = content.toString().replace(/{{\s*(\w+)\s*}}/g, (match, p1) => {
    return `[${p1}]`;
  });

  const headings: MDHeadingsList = [];
  const mdxSource = await serialize(content, {
    parseFrontmatter: true,
    mdxOptions: {
      remarkPlugins,
      rehypePlugins: [[rehypeExtractHeadings, {headings}]],
      format: 'mdx',
    },
  });

  return {props: {source: mdxSource, headings, version}};
}
