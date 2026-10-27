#!/usr/bin/perl
# AIwareness rebrand: assembles the pages from _src/pages + _src/partials.
# Run from anywhere:  perl _src/build.pl
# Output: one .html per page in the site root (the folder above _src).
# Pages in a subfolder of _src/pages (e.g. blog/) are written to the
# same subfolder. Write every link and image path in sources relative to the
# site root; the build adds "../" for pages that live in a subfolder.
#
# Page file format: "key: value" lines (title_en, title_de, desc_en, desc_de,
# nav, head, bodyclass), then a line "---", then the page body.
#   {{> name}}        includes _src/partials/name.html
#   {{VER}}           cache-busting version for CSS and JS (bump below)
#   {{cur:key}}       becomes aria-current="page" when nav: key
#   {{PAGE}}          the page's public address without .html (for canonical URLs)
#   {{TITLE_EN_JSON}} {{DESC_EN_JSON}}  title and description escaped for JSON-LD
#   {{HEADMETA}}      robots and preload tags from the optional keys
#                     robots (e.g. "noindex, follow") and preload (an image path;
#                     without it, the first page-hero background is preloaded)
# The build also writes sitemap.xml with every page that is not noindex.
use strict;
use warnings;
use utf8;
use File::Basename qw(dirname);
use Cwd qw(abs_path);

my $VER = '20261027c';

my $src  = dirname(abs_path($0));
my $root = dirname($src);

sub slurp {
  my ($f) = @_;
  open(my $fh, '<:encoding(UTF-8)', $f) or die "Cannot read $f: $!";
  local $/; my $c = <$fh>; close $fh; return $c;
}

sub include {
  my ($text, $depth) = @_;
  die "Include loop" if $depth > 8;
  $text =~ s/\{\{>\s*([\w-]+)\s*\}\}/include(slurp("$src\/partials\/$1.html"), $depth + 1)/ge;
  return $text;
}

sub attr { my $v = shift; $v =~ s/&(?!amp;|#)/&amp;/g; $v =~ s/"/&quot;/g; return $v; }
sub jsonstr { my $v = shift; $v =~ s/\\/\\\\/g; $v =~ s/"/\\"/g; return $v; }
my @sitemap;

my @pages;
sub collect {
  my ($dir, $rel) = @_;
  opendir(my $dh, $dir) or die "Cannot open $dir: $!";
  for my $e (sort readdir $dh) {
    next if $e =~ /^\./;
    if (-d "$dir/$e") { collect("$dir/$e", "$rel$e/"); }
    elsif ($e =~ /\.html$/) { push @pages, "$rel$e"; }
  }
  closedir $dh;
}
collect("$src/pages", '');

my $layout = slurp("$src/partials/layout.html");

for my $p (@pages) {
  my $raw = slurp("$src/pages/$p");
  my ($meta, $body) = split /^---\s*$/m, $raw, 2;
  die "$p: missing --- separator" unless defined $body;
  my %m;
  for (split /\n/, $meta) { $m{$1} = $2 if /^(\w+):\s*(.*?)\s*$/; }
  for (qw(title_en title_de desc_en desc_de nav)) { die "$p: missing $_" unless defined $m{$_}; }

  my $out = $layout;
  my $headx = $m{head} ? slurp("$src/partials/$m{head}.html") : '';
  $out =~ s/\{\{HEADEXTRA\}\}/$headx/g;
  $out =~ s/\{\{BODY\}\}/$body/;
  $out = include($out, 0);
  $out =~ s/\{\{TITLE_EN\}\}/attr($m{title_en})/ge;
  $out =~ s/\{\{TITLE_DE\}\}/attr($m{title_de})/ge;
  $out =~ s/\{\{DESC_EN\}\}/attr($m{desc_en})/ge;
  $out =~ s/\{\{DESC_DE\}\}/attr($m{desc_de})/ge;
  $out =~ s/\{\{TITLE_EN_JSON\}\}/jsonstr($m{title_en})/ge;
  $out =~ s/\{\{DESC_EN_JSON\}\}/jsonstr($m{desc_en})/ge;
  # Robots and an early start for the largest image above the fold.
  my $headmeta = '';
  $headmeta .= qq(<meta name="robots" content="$m{robots}">\n) if $m{robots};
  my $pre = $m{preload};
  ($pre) = $body =~ /class="ph-bg"[^>]*url\('([^']+)'\)/ unless $pre;
  $headmeta .= qq(<link rel="preload" as="image" href="$pre" fetchpriority="high">\n) if $pre;
  $out =~ s/\{\{HEADMETA\}\}/$headmeta/g;
  # Public address of the page: no .html, the home page is the site root.
  (my $pageurl = $p) =~ s/\.html$//;
  $pageurl =~ s{(^|/)index$}{$1};
  $out =~ s/\{\{PAGE\}\}/$pageurl/g;
  my $bc = $m{bodyclass} ? qq( class="$m{bodyclass}") : q();
  $out =~ s/\{\{BODYCLASS\}\}/$bc/g;
  $out =~ s/\{\{VER\}\}/$VER/g;
  $out =~ s/\{\{cur:(\w+)\}\}/$1 eq $m{nav} ? ' aria-current="page"' : ''/ge;
  die "$p: unresolved placeholder $1" if $out =~ /(\{\{[^}]*\}\})/;

  # Pages in a subfolder: point root-relative paths up one level per folder.
  # Absolute URLs (https:, mailto:), in-page anchors (#) and query-only links (?) stay as they are.
  my $depth = () = $p =~ m{/}g;
  if ($depth) {
    my $up = '../' x $depth;
    $out =~ s{\b(href|src)="(?![a-z][a-z0-9+.-]*:|#|/|\?)([^"]*)"}{$1="$up$2"}g;
    $out =~ s{url\((['"]?)(?![a-z][a-z0-9+.-]*:|/|#)}{url($1$up}g;
    my $dir = dirname("$root/$p");
    mkdir $dir unless -d $dir;
  }

  # Clean links without .html: GitHub Pages serves about.html at /about, and
  # old .html addresses keep working. index.html becomes the folder itself.
  # Sources keep writing "page.html"; only the built pages are rewritten.
  $out =~ s{\bhref="((?:\.\./)*)index\.html(#[^"]*)?"}{'href="' . ($1 eq '' ? './' : $1) . ($2 // '') . '"'}ge;
  $out =~ s{\bhref="(?![a-z][a-z0-9+.-]*:|#|/|\?)([^"#?]+?)\.html(#[^"]*)?"}{'href="' . $1 . ($2 // '') . '"'}ge;

  open(my $fh, '>:encoding(UTF-8)', "$root/$p") or die "Cannot write $root/$p: $!";
  print $fh $out; close $fh;
  print "built $p\n";
  push @sitemap, [$pageurl, (stat("$src/pages/$p"))[9]] unless ($m{robots} // '') =~ /noindex/;
}

# Sitemap for search engines (home first, then alphabetical).
{
  my @rows = sort { ($a->[0] eq '' ? 0 : 1) <=> ($b->[0] eq '' ? 0 : 1) || $a->[0] cmp $b->[0] } @sitemap;
  open(my $fh, '>:encoding(UTF-8)', "$root/sitemap.xml") or die $!;
  print $fh qq(<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n);
  for my $r (@rows) {
    my @d = gmtime($r->[1]);
    my $date = sprintf('%04d-%02d-%02d', $d[5] + 1900, $d[4] + 1, $d[3]);
    print $fh "  <url><loc>https://aiwareness.space/$r->[0]</loc><lastmod>$date</lastmod></url>\n";
  }
  print $fh "</urlset>\n"; close $fh;
  print "wrote sitemap.xml\n";
}

# Static files (e.g. redirect stubs for moved pages) are copied as they are,
# subfolders included (static/newsletters/x.html becomes newsletters/x.html).
sub copy_static {
  my ($dir, $rel) = @_;
  opendir(my $sh, $dir) or return;
  for my $f (sort grep { !/^\./ } readdir $sh) {
    if (-d "$dir/$f") {
      mkdir "$root/$rel$f" unless -d "$root/$rel$f";
      copy_static("$dir/$f", "$rel$f/");
      next;
    }
    my $c = slurp("$dir/$f");
    open(my $fh, '>:encoding(UTF-8)', "$root/$rel$f") or die $!;
    print $fh $c; close $fh;
    print "copied $rel$f\n";
  }
  closedir $sh;
}
copy_static("$src/static", '');
