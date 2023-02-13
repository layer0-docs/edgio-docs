import {readFile} from 'fs/promises';
import {join} from 'path';

import {globby} from 'globby';
import {MDXRemote} from 'next-mdx-remote';
import {serialize} from 'next-mdx-remote/serialize';

import {
  remarkPlugins,
  markdownToHtml,
} from '../../../../plugins/markdownToHtml';
import {MDXComponents as Components} from '../../../components/MDX/MDXComponents';
import {basePaths, versionedPaths} from '../../../data/navigation';

import {MarkdownPage} from 'components/Layout/MarkdownPage';
import {Page} from 'components/Layout/Page';
import JSONRoutes from 'utils/jsonRoutes';
import templateReplace from 'utils/templateReplace';

const applicationsPath = 'src/pages/guides';

export default function VersionedGuide({source}) {
  return (
    <Page routeTree={JSONRoutes}>
      <MarkdownPage meta={{title: 'Foo'}}>
        <MDXRemote {...source} components={Components} />
      </MarkdownPage>
    </Page>
  );
}

export const getStaticPaths = async () => {
  // determine available versions from config files
  const versions = (
    await globby('config/v*.config.js', {
      cwd: join(process.cwd(), 'src'),
    })
  )
    // extract the version from the filename
    .map((file) => (file.match(/v(\d+)\.config\.js/) || [])[1]);

  // determine available guides from filesystem
  const guides = await globby('pages/guides', {
    cwd: join(process.cwd(), 'src'),
    expandDirectories: {
      extensions: ['md', 'mdx'],
    },
  });

  console.log(versions, guides);

  const routes = [
    {params: {version: 'v5', slug: ['getting_started']}},
    {params: {version: 'v6', slug: ['getting_started']}},
  ];
  return {
    paths: routes,
    fallback: false,
  };
};

export async function getStaticProps({params}) {
  const {version, slug} = params;
  const files = await globby(
    ['md', 'mdx'].map((ext) => `${applicationsPath}/${slug}.${ext}`)
  );

  const file = files[0];
  let content = await readFile(join(process.cwd(), file), 'utf8');

  // get config for this version
  const config = await import(`../../../config`);

  // update template with versioned constants
  content = templateReplace(content, config.getVersionedConfig(version));

  // Any {{ VALUE }} that was not replaced in the above step
  // should be replaced with only 1 set of {} braces
  content = content.toString().replace(/{{\s*(\w+)\s*}}/g, (match, p1) => {
    return `{${p1}}`;
  });

  const mdxSource = await serialize(content, {
    mdxOptions: {remarkPlugins},
  });

  return {props: {source: mdxSource}};
}
